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

## No endpoint to fetch a booking's pending reschedule request

Found while building Module 15's customer-response-to-a-salon-proposed-
reschedule feature (`components/respond-to-reschedule-dialog.tsx`).
`POST /bookings/:id/reschedule-request` and `POST /salon-bookings/:id/propose-reschedule`
both create a `booking_reschedule_requests` row and return it directly to
the proposer (`RescheduleRequestDTO`), but there's no `GET` anywhere to read
it back later — not on `BookingDTO` (checked directly against the backend's
own `booking.types.ts`, not just `frontend_handover.md`), not as a separate
route. That's fine for the proposer, who already has the response from
their own create call, but the *responder* — a different person, on a
different device/session — has no way to discover that a request even
exists, let alone what it proposes, before calling
`POST /bookings/:id/approve-reschedule`/`reject-reschedule`.

This is a structurally worse version of the "no GET, so this component only
lists what it created this session" gap `BranchHolidaysCard`/`ServiceManager`
already carry — those work around it by having the *same* actor create and
view; here the creator and responder are never the same person, so there's
no session-local list to fall back on. `RespondToRescheduleDialog` is
honest about this rather than faking a preview: it offers Accept/Decline
unconditionally on any upcoming booking and points the responder at the
email notification they were sent for what's actually being proposed;
calling either action with nothing pending 404s with a clear message ("No
pending reschedule request for this booking"), shown as-is. A real fix
needs either `BookingDTO` to carry the latest pending request's fields, or
a dedicated `GET /bookings/:id/reschedule-request` route.

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

## `POST /payments/create-order`'s "one payment per booking" guard isn't race-safe

Found while re-testing the Payment flow (§7) end-to-end with real Razorpay
test transactions. Two *sequential* calls are guarded correctly — call it a
second time while a row for that booking is already `PENDING` and it 409s
cleanly (`{"code":"CONFLICT","message":"A payment already exists for this
booking"}`), which is what `app/bookings/[bookingId]/pay/page.tsx` relies on
and what its own `busy`-disabled Pay button already prevents from being
triggered twice from a single tab.

But firing two calls concurrently (`Promise.all` of two `fetch`es with the
same `bookingId`, same session) both returned `201` with two distinct real
Razorpay orders (`order_TaS1112NB8BLhg` and `order_TaS113NNdA9DT5`), and
`GET /payments/my-payments` confirmed two separate `PENDING` rows for the
one booking afterward — not one row plus a rejected second attempt. The
existence check and the insert aren't atomic (no DB unique constraint on
`bookingId` for a live payment, no row lock around the check), so two
requests that land in the same narrow window both pass the check before
either commits.

Not reachable from this frontend's own UI today (the Pay button's `disabled
={busy}` blocks a same-tab double-click, and there's no legitimate way to
issue two `create-order` calls from one page load) — but it's a real gap in
the endpoint's own guarantee, not a frontend bug: the same booking opened in
two tabs/devices (or a slow first response racing a user's frustrated
second click before `busy` flips) could end up with two live Razorpay
orders and, if the customer completed both, two `SUCCESS` payments for one
booking. Confirmed via direct API calls against the live backend, not
inferred from reading the code. A real fix needs a DB-level unique
constraint (e.g. one non-`FAILED` payment per `bookingId`) or a
transaction-level lock in `payment.service.ts`'s `create-order` handler,
not something to work around from this side.

## A claimed walk-in still looks anonymous to the Salon Owner

Found while re-testing §16's cross-role scenario ("Owner creates a
walk-in → Customer B claims it by `bookingNumber` → Owner's booking
list shows it linked to Customer B, not anonymous anymore"). Created a
walk-in as the owner (`customerName: "Walkin Payonline"`, a placeholder
phone, `customerId: null`), had Customer B claim it via
`POST /bookings/claim`, then re-fetched the same booking from the
owner side (`GET /salon-bookings?status=APPROVED`): `customerId` had
genuinely changed to Customer B's real user id (confirmed against the
`customerId` on Customer B's own payment row for the same booking) —
the claim itself works correctly. But `customerName`/`customerPhone`
were unchanged, still the original walk-in placeholder values.

Traced into the backend: `booking.repository.ts`'s `claimBooking()`
only ever does `UPDATE bookings SET customer_id = $1 ...` — it never
touches `customerName`/`customerPhone`, and there's no separate
"claimed" boolean anywhere in the `BookingDTO`. `components/owner/
salon-booking-card.tsx` just renders `booking.customerName ||
"Registered customer"` — correct frontend code, but the field it reads
never changes on claim, so **the owner has no way to ever tell a
still-anonymous walk-in apart from one a real registered customer
claimed** — both show the same static name/phone captured at creation
time. A real fix needs the backend to either null out
`customerName`/`customerPhone` on a successful claim (so the existing
`|| "Registered customer"` fallback kicks in) or expose a `claimedAt`/
`claimedBy` field the frontend can render instead.

## No frontend UI for two live, documented endpoints — `POST /payments/refund-request` and `POST /reviews/:reviewId/reply`

Found while re-testing §8 (Reviews) and §15 (Admin Refunds). Both are
🟢 Live per `frontend_handover.md` (lines 159 and 179), but neither has
any UI anywhere in this app — confirmed by grepping the whole
`app/`/`components/` tree, not just spot-checking a likely page. A
customer today has no way to actually request a refund through the
app; a Salon Owner has no way to actually reply to a review through
the app. Both were verified to work when called directly against the
live backend (a real refund request and a real reply were created this
way, to still test the *other* side of each feature — the Admin
Refunds Queue and the public review list respectively). Not built here
since each needs a product/design decision on placement and copy, and
this was a testing pass, not a feature-build one.

## Salon-owner review replies are invisible everywhere they'd actually be seen

Found immediately after using the workaround above to create a real
reply via `POST /reviews/:reviewId/reply` (Module 8) — the endpoint
itself works and echoes the new `reply` back in its own response, but
reloading `GET /reviews/salon/:salonId` for the exact same review
afterward shows `"reply": null`. Traced into the backend source
(`review.service.ts`): `listBySalon`/`listByStaff`/`listByService` all
route through a shared `toDTOList()` that only ever fetches
`findCategoryRatings()` per row — none of them fetch replies at all,
so every DTO from any list endpoint hardcodes `reply: null`
regardless of what's actually in the `review_responses` table. Only
`getDetail()` (single review by id) calls `listReplies()` and includes
the real value — and nothing in this frontend, or apparently anywhere
in `frontend_handover.md`'s documented contract, ever calls a
single-review detail route.

Net effect: a Salon Owner's reply is real, persisted, and correctly
returned by the write endpoint, but **no customer-facing view can ever
show it** — `app/reviews/salon/[salonId]/page.tsx`'s existing
`r.reply && (...)` rendering (Module 8) is correct frontend code
sitting on top of a backend response that just never carries the data
it's checking for. This is a backend fix (join/fetch replies in
`toDTOList`, or replace the three list queries with one that includes
`review_responses`), not something to patch by adding a second
frontend fetch-per-review — that would be N+1 requests for what should
be one list call.
