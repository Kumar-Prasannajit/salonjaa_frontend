# Known Backend Limitations

Behavioral/policy gaps found while building the frontend that aren't a missing
endpoint (see `docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md` for those) — real
constraints of how the currently-live endpoints behave. Not proposals with a
drafted contract, just flagged so they're tracked somewhere instead of only
living in code comments.

## ~~A coupon can never actually be applied to a booking~~ — Resolved (Module 12)

`POST /bookings` gained an optional `couponCode` field that snapshots the
discount into `discountAmount`/`totalAmount` at creation time, using the same
eligibility rules as `POST /payments/coupons/validate`. Left here (rather than
deleted) only as a pointer for anyone who finds this doc via an old link —
see `../salonjaa-backend/docs/PROGRESS.md`'s Module 12 entry for the full
write-up. Frontend Checkout has not yet been revisited to actually pass
`couponCode` through and drop its "informational preview only" disclaimer —
that's a frontend follow-up, not a backend gap anymore.

## ~~A payment left open in the Razorpay widget can never be retried~~ — Resolved (Module 13)

`POST /payments/:paymentId/cancel` plus a `payment.expire` backstop job now
both exist. See Module 13 in `../salonjaa-backend/docs/PROGRESS.md`.
`app/bookings/[bookingId]/pay/page.tsx` already calls the cancel endpoint
from Razorpay's `ondismiss` handler, per `frontend/CLAUDE.md`.

## ~~Sessions don't survive a page reload or a backgrounded/discarded tab~~ — Resolved (Module 14a)

Found while manually testing all three roles at once (3 browser profiles,
one each logged in as Customer/Salon Owner/Admin): switching back to a
profile that had been in the background for a while asks to sign in again,
even though nothing server-side ever invalidated that session — the
`refresh_tokens` row is still valid and unrevoked.

**Backend now issues `accessToken`/`refreshToken` as `httpOnly`, `SameSite=Lax`
cookies** (`Secure` in production only) on `POST /auth/verify-otp` and
`POST /auth/refresh-token`, alongside the unchanged JSON body — see
`../salonjaa-backend/docs/PROGRESS.md`'s Module 14a entry. A companion
`csrfToken` cookie (deliberately **not** `httpOnly`, so JS can read it) is
also set; a cookie-authenticated `POST`/`PUT`/`PATCH`/`DELETE` now requires
an `X-CSRF-Token` header matching it, or the backend returns `403`. A
Bearer-header request (today's `lib/api-client.ts` behavior) is unaffected
and never needs the CSRF header — this is additive, nothing existing broke.
Verified end-to-end against a live backend instance: cookie-only
authenticated reads, CSRF `403`/`200` on a mutating request, Bearer requests
still working unchanged, cookie-only refresh, and logout clearing all three
cookies and actually invalidating the session.

**Frontend integration done (`45cad92`):** `lib/api-client.ts`'s `apiFetch()`
now sends `credentials: "include"` on every call (including the
refresh-token retry) and attaches the `csrfToken` cookie's value as an
`X-CSRF-Token` header on mutating requests; `hooks/use-account.ts` gained a
mount-time session-restore effect (`POST /auth/refresh-token` with an empty
body + `credentials: "include"`, then rehydrates via `GET /users/me` same as
a normal login) that fails silently into the existing signed-out state when
no cookie is present. No longer observable in the browser.

## ~~No `AWAITING_PAYMENT` booking status or a "pay after service" option~~ — Resolved (Module 14b)

`bookingStatusEnum` had no `AWAITING_PAYMENT` value — an `APPROVED` booking
stayed `APPROVED` even once payment was due, in progress, or skipped. This
was flagged as not-yet-enforced since Module 6/7 ("the client's described
'approve then 15-minute payment window' ... not implemented"); manual
testing surfaced the customer-facing gap directly (My Bookings had no
"Awaiting Payment" state, no pay-at-salon choice).

**Backend now has a real `AWAITING_PAYMENT` status** — see
`../salonjaa-backend/docs/PROGRESS.md`'s Module 14b entry. `POST /bookings`
accepts an optional `paymentMethod` (`"ONLINE"` default, or
`"PAY_AT_SALON"`). When the salon owner approves an `ONLINE` booking it now
stops at `AWAITING_PAYMENT` (not `APPROVED`) with a real
`BOOKING_PAYMENT_WINDOW_MINUTES`-minute window (15, the client's own stated
figure) before it auto-cancels if unpaid; `POST /payments/create-order` now
requires `AWAITING_PAYMENT`; a successful `POST /payments/verify` moves it
to `APPROVED`. A `PAY_AT_SALON` booking is unaffected — approve still goes
straight to `APPROVED`, no online payment ever expected. `GET
/bookings/my-bookings`'s `status` filter and `BookingDTO` both now expose
this (`paymentMethod` field, `AWAITING_PAYMENT` as a filterable status).
Verified end-to-end against a live backend instance with real data,
including forcing the payment window to 1 minute to confirm the actual
auto-cancel transition (not just reading the code).

**Frontend integration done (`899cb32`):** Checkout
(`app/book/[branchId]/checkout/page.tsx`) now has a payment-method choice
(`ONLINE`/`PAY_AT_SALON`, no design mockup exists for it) passed as
`POST /bookings`'s `paymentMethod` field; My Bookings
(`components/booking-card.tsx`, `app/(tabs)/bookings/page.tsx`) shows
`AWAITING_PAYMENT` as its own "Payment Due" state with a payment-window
notice; the Pay page's gates moved from `APPROVED` to `AWAITING_PAYMENT`,
including messaging for a booking that auto-cancelled because the window
expired. No longer observable in the browser.

## ~~Walk-in booking created despite an existing overlapping booking for the same staff~~ — Investigated, not a backend bug

Manually reproduced: booked a slot as a customer with a specific stylist
selected, then — before that booking was approved — created a walk-in as the
salon owner for the same branch/date/slot/stylist. The walk-in was created
successfully instead of being rejected.

**Investigated against the real repro data and confirmed not reproducible.**
The two `bookings` rows from the actual repro session
(`0cdb07e8-5e38-4727-8e0a-e4bef2cbf6d0` and `3c3f40ad-4e57-448b-82c2-1f595480ed8d`,
both on The Luxe Salon's branch) turned out to have **different**
`selectedStaffId` values — `733d6675…` (Rahul Verma) on the original online
booking vs. `72cbb996…` (Ananya Reddy) on the walk-in — i.e. hypothesis 1
below, not a same-staff conflict at all; two different staff serving
overlapping slots is correct, not a bug. A live re-test with the *actual*
same `staffId`/branch/slot combination (customer books Rahul Verma
09:00–09:45 → walk-in attempts Rahul Verma, same branch, same slot)
correctly returned `409 CONFLICT — "Selected staff is no longer available
for this time"`, exactly as `createBookingTransactional`'s guard is written.
No code change made — the guard is doing its job. Test booking cleaned up
afterward (cancelled via the real API, not deleted directly).

Original repro notes, left for context:

This is surprising because `booking.repository.ts`'s
`createBookingTransactional` (shared by both `POST /bookings` and
`POST /salon-bookings/walk-in`, run inside the same per-branch
advisory-locked transaction) already has a same-staff overlap guard:

```ts
const overlapping = await tx.select(...).from(bookings).where(and(
  eq(bookings.branchId, params.branchId),
  inArray(bookings.bookingStatus, [...CAPACITY_CONSUMING_BOOKING_STATUSES]), // PENDING, APPROVED
  lt(bookings.scheduledStart, params.scheduledEnd),
  gt(bookings.scheduledEnd, params.scheduledStart)
));
if (params.selectedStaffId && overlapping.some((b) => b.selectedStaffId === params.selectedStaffId)) {
  throw new ConflictError("Selected staff is no longer available for this time");
}
```

`PENDING` is capacity-consuming (`CAPACITY_CONSUMING_BOOKING_STATUSES` in
`shared/constants.ts`), so an unapproved original booking should still have
been counted here — on paper this should have 409'd. Two possibilities worth
checking against the actual rows from the repro:

1. The original customer booking was created with "No Preference" (no
   specific stylist), so `selectedStaffId` was `null` on it — in which case
   the walk-in claiming a specific stylist for the first time is *correct*
   behavior, not a bug, since nothing had claimed that stylist yet.
2. The two `selectedStaffId` values, or the computed `scheduledStart`/`scheduledEnd`
   windows, didn't actually match/overlap the way the UI implied (e.g. a
   duration difference between the two bookings' service selections shifting
   the end time). `resolveSlot`/`buildDateTime` parse `bookingDate`+`slotId`
   into a `Date` with no explicit timezone (interpreted in the Node process's
   local time) — worth double-checking this is consistent between however
   the two bookings' dates were sent.

Should be checked against the actual two `bookings` rows (same
`selectedStaffId`? overlapping `scheduledStart`/`scheduledEnd`?) rather than
guessed at further from the frontend side.
