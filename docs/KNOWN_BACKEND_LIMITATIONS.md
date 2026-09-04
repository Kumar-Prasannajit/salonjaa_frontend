# Known Backend Limitations

Behavioral/policy gaps found while building the frontend that aren't a missing
endpoint (see `docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md` for those) — real
constraints of how the currently-live endpoints behave. Not proposals with a
drafted contract, just flagged so they're tracked somewhere instead of only
living in code comments.

## A coupon can never actually be applied to a booking

`POST /payments/coupons/validate` (Module 7) is real and live, but no
documented endpoint anywhere attaches a validated coupon to a booking or a
payment — `POST /bookings`'s body has no `couponCode` field, and
`POST /payments/create-order` computes its amount straight from
`booking.totalAmount`. So today, validating a coupon at Checkout
(`app/book/[branchId]/checkout/page.tsx`) can only ever be an informational
preview — the discount is never actually deducted from what the customer
pays. The frontend discloses this inline rather than showing a discounted
total that wouldn't be honored. Needs either a `couponCode` field on
`POST /bookings` (snapshotting the discount into `discountAmount`, which the
`bookings` table already has a column for) or an equivalent attach step
before payment.

## A payment left open in the Razorpay widget can never be retried

`POST /payments/create-order` blocks a second order while one exists with
status `PENDING` or `SUCCESS` — only a `FAILED` payment can be retried
(`payment.service.ts`). But a customer who opens the Razorpay checkout widget
and closes it without completing payment (`ondismiss`) leaves that payment
row `PENDING` forever: there's no webhook, and nothing ever calls
`POST /payments/verify` for that attempt to move it to `SUCCESS` or `FAILED`.
The booking becomes permanently unpayable through the app. `app/bookings/[bookingId]/pay/page.tsx`
surfaces this as a plain notice rather than implying retry will work. Needs
either a webhook-driven or time-based transition of a stale `PENDING`
payment to `FAILED` (or a dedicated "cancel this payment attempt" endpoint)
so `create-order` becomes retryable again.
