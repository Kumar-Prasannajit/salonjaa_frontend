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

## Sessions don't survive a page reload or a backgrounded/discarded tab

Found while manually testing all three roles at once (3 browser profiles,
one each logged in as Customer/Salon Owner/Admin): switching back to a
profile that had been in the background for a while asks to sign in again,
even though nothing server-side ever invalidated that session — the
`refresh_tokens` row is still valid and unrevoked.

Root cause is entirely frontend, but the fix needs a contract change here:
`POST /auth/verify-otp` and `POST /auth/refresh-token` return
`accessToken`/`refreshToken` in the JSON body (per `frontend_handover.md`),
so `Salonjaa_Frontend`'s `lib/api-client.ts` necessarily holds them in a
plain in-memory JS variable — anything more persistent that's still
JS-readable (`localStorage`) is an XSS token-theft surface, which is why it
was built that way rather than an oversight. In-memory means a reload, or
Chrome discarding a backgrounded tab/window (easy to hit with 3 role-tabs
open at once), silently drops the session and forces a fresh OTP login.

**Needed backend change:** issue `accessToken`/`refreshToken` as `httpOnly`,
`Secure`, `SameSite` cookies via `Set-Cookie` on both of those endpoints
(alongside or instead of the JSON body), with CORS configured to allow
credentials from the frontend's origin. Once that ships, `lib/api-client.ts`
can switch from attaching `Authorization: Bearer <token>` to sending
`credentials: "include"` and letting the browser hold the cookie — removing
the in-memory tradeoff entirely, and making it immune to XSS token theft to
boot. Needs CSRF protection considered for state-changing endpoints once
cookies are the auth mechanism.

## No `AWAITING_PAYMENT` booking status or a "pay after service" option

`bookingStatusEnum` (`enums.ts`) has no `AWAITING_PAYMENT` value — an
`APPROVED` booking stays `APPROVED` even once payment is due, in progress, or
skipped. This was already flagged as not-yet-enforced in
`../salonjaa-backend/docs/PROGRESS.md`'s Module 6/7 notes ("the client's
described 'approve then 15-minute payment window' ... not implemented"), but
manual testing surfaced the customer-facing gap directly: there's no way for
My Bookings to show "Awaiting Payment" as its own filterable state, and no
way for a customer to choose to pay later / pay at the salon instead of
online.

Separately, `paymentMethodEnum` already has a `PAY_AT_SALON` value
(`enums.ts`) but nothing in `booking.service.ts` or `payment.service.ts` ever
sets or asks for it — every booking implicitly assumes online payment via
Razorpay once approved.

**Needed backend change:** a real `AWAITING_PAYMENT` (or similar) status
transition once a booking is `APPROVED` and payment is expected but not yet
`SUCCESS`, exposed on `GET /bookings/my-bookings`'s `status` filter, plus a
way for `POST /bookings` (or a later step) to record the customer's chosen
payment method (`ONLINE` vs `PAY_AT_SALON`) so the frontend can branch UI
accordingly instead of always pushing straight to Razorpay checkout.

## Walk-in booking created despite an existing overlapping booking for the same staff — needs verification with real data

Manually reproduced: booked a slot as a customer with a specific stylist
selected, then — before that booking was approved — created a walk-in as the
salon owner for the same branch/date/slot/stylist. The walk-in was created
successfully instead of being rejected.

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
