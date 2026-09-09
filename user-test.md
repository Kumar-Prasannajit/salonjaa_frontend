# Salonjaa — Manual E2E Test Checklist

How to use this file: open the listed route, do the action, compare to **Expect**. Tick `[x]` only when it actually matches. If it doesn't, leave it unticked and write what happened instead (short note) — then keep going, don't get stuck on one item. Come back and re-test after a fix.

This checklist assumes **all 8 pending module branches (15, 16, 17, 19, 20, 21, 22, 23) are merged** into one branch first — see `docs/E2E_TEST_PROMPT.md`. On `owner-admin-dashboards` alone, the Wallet/Claim-Walk-in/Promotions/Analytics/Variants/Strikes sections below have nothing to open.

**No frontend screen exists for these** (confirmed across every branch) — don't hunt for a page, test via Postman/curl against the backend directly, or skip and just note "API-only, no UI":
- Admin coupon CRUD, category CRUD, settlement CRUD, customer-strikes view/add/remove (`/admin/customers/:id/strikes`)
- Filing a complaint (`POST /complaints`) — only the admin *queue* (`/admin/complaints`) has a screen

---

## 0. One-time setup

- [ ] Redis running (Docker Desktop started, redis container/compose up) — BullMQ jobs (payment/booking expiry, strike checks) silently don't fire otherwise.
- [ ] Backend: `.env` filled in (`DATABASE_URL`, `REDIS_URL`, JWT secrets, optional Razorpay **test-mode** keys), `npm run db:migrate`, `npm run db:seed`, `npm run dev` → `http://localhost:4000`.
- [ ] Frontend: `.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`, `NEXT_PUBLIC_RAZORPAY_KEY_ID=<same test key_id as backend>`, `npm run dev` → `http://localhost:3000`.
- [ ] Backend has no SMTP configured → every OTP prints to the **backend terminal**, not a real inbox. Keep that terminal visible throughout.
- [ ] Create 4 test accounts by logging in once each (OTP flow) at `/profile`:
  - `customer.a@test.dev` — stays CUSTOMER
  - `customer.b@test.dev` — stays CUSTOMER (needed for "not-yours" 403/404 checks)
  - `owner@test.dev` — then in the backend: `npm run db:grant-role -- owner@test.dev SALON_OWNER`
  - `admin@test.dev` — then: `npm run db:grant-role -- admin@test.dev ADMIN`
  - Re-login (sign out/in) after granting a role — the JWT carries roles from login time.
- [ ] **Auth is cookie-based and shared per browser profile** — logging a second role into another tab of the *same* Chrome profile silently swaps the first tab's session on its next reload. For genuinely simultaneous roles, use separate contexts: e.g. Window 1 = normal profile (Customer A), Window 2 = Incognito (Owner), Window 3 = a second Chrome profile (Admin), Window 4 = another Incognito (Customer B). Plain tabs are fine as long as only one role is logged into that profile at a time.

---

## 1. Auth (`/profile` signed out)

- [ ] Valid email → Send OTP → success toast + resend countdown (button disabled until it elapses)
- [ ] OTP from backend console, correct → signs in, lands on Profile
- [ ] Wrong OTP → inline error, stays signed out
- [ ] Request OTP twice within the cooldown → second request blocked/rate-limited, not silently sent again
- [ ] Reload the page after signing in → **stays signed in** (cookie session restore) — no forced re-login
- [ ] Sign out → cookies cleared, reload stays signed out

## 2. Profile & Addresses

`/profile` (signed in)
- [ ] First-ever login with no `name` → a name prompt appears before/around Profile; entering it saves (`PATCH /users/me`) and doesn't re-prompt after reload
- [ ] Edit gender/DOB → saves, persists after reload
- [ ] Phone number and photo are **read-only placeholders** (no edit control) — expected, not a bug; don't file this as broken

`/profile/addresses`
- [ ] Add address → appears in list
- [ ] Edit address → updates in place
- [ ] Delete → removed; deleting the last one shows the empty state
- [ ] Visit this route while signed out → redirected to `/profile`, not a blank/broken page

## 3. Browse (anonymous — test signed out first, then signed in)

`/` (Home)
- [ ] "Popular Near You" loads (skeleton → cards), no crash with 0 results
- [ ] "Use my location" triggers the **browser's own** geolocation prompt (not a fake location picker); once granted, cards reorder and show `distanceKm`
- [ ] Top Services chips navigate into Explore pre-filtered by category

`/explore`
- [ ] Free-text search debounces and filters by salon/branch name
- [ ] Category filter (`serviceCategoryId`) narrows results
- [ ] Zero results → "no salons found" empty state, not a blank screen
- [ ] Each card shows a price tier (`₹`/`₹₹`/`₹₹₹`), a gender-served tag, and an offer banner **only** for a branch with a promotion the owner explicitly flagged `featured` — confirm a branch with an *active but non-featured* promotion shows **no** banner (this is intentional, per Module 21)

`/salons/[branchId]`
- [ ] Gallery shows the owner's uploaded photos (Module 17) if any, empty gracefully if none
- [ ] Only `ACTIVE` services listed
- [ ] A service with variants (Module 22) requires picking a variant before it can be added; a service with an empty `variants[]` books directly at `basePrice`
- [ ] "Call Salon" button uses the branch phone if set, hidden/absent if `null`
- [ ] "View Branches" link lists the salon's other branches (same `salonId`)

## 4. Booking creation

`/book/[branchId]/stylist`
- [ ] "No preference" option present
- [ ] Only staff eligible for **all** selected services and not on leave that day appear

`/book/[branchId]/slot`
- [ ] Slots reflect the branch's slot-template if the owner configured one (Module 17); otherwise the fixed 30-min fallback
- [ ] A fully booked date shows "no slots available", doesn't crash

`/book/[branchId]/checkout`
- [ ] Signed out → inline auth step appears first, then a basic-details (name) step if still missing, before the booking form
- [ ] Coupon: a valid code shows a discount preview with the "not final" disclaimer; an invalid/expired/exhausted/below-minimum code shows the `422` message, isn't silently accepted
- [ ] Payment method picker offers **ONLINE**, **PAY_AT_SALON**, and **WALLET** (Module 20)
  - [ ] WALLET with insufficient balance (check `GET /wallet` first) → `422` at submit, no booking created
  - [ ] WALLET with sufficient balance → booking created, wallet debited immediately (confirm on `/profile/wallet`)
- [ ] Submit creates a `PENDING` booking → redirected to `/book/[branchId]/requested` (an honest "pending approval" screen, not a fake "Confirmed")
- [ ] Submit button disables while pending — can't double-submit into two bookings
- [ ] Force a conflict (two tabs booking the same last slot) → the loser gets `409`, slots refresh rather than showing a stale success

## 5. Customer strikes / advance payment (Module 16) — needs setup via Owner + repeats

- [ ] As Owner, mark 4 separate `APPROVED` bookings for the same customer as `NO_SHOW` (`/owner/bookings` → no-show action, only available at/after `scheduledStart`)
- [ ] After the 4th, that customer's **next** `PAY_AT_SALON` booking shows `requiresAdvancePayment: true` / an `advanceAmount` (10% of total) somewhere in the booking flow/detail — confirm the UI surfaces this rather than silently ignoring it
- [ ] Owner tries to approve that booking before the advance is paid → blocked (`409`)
- [ ] Customer pays the advance (same `create-order`/`verify` flow, for just the advance amount) → owner can now approve
- [ ] Choosing **ONLINE** payment instead of PAY_AT_SALON for a restricted customer needs no separate advance step (full payment upfront already covers it) — confirm no double-charge/duplicate advance prompt
- [ ] Cancel a booking whose advance was paid → no refund-request possible (`409` on `POST /payments/refund-request`); the forfeited amount instead lands as a `+` wallet transaction (`ADVANCE_PAYMENT_FORFEITED_TO_WALLET` reason) on `/profile/wallet`
- [ ] Removing a strike is Admin-only via API (`POST /admin/customers/:id/strikes/:strikeId/remove`) — **no frontend screen**, verify via curl/Postman if you want this covered at all

## 6. Cancellation & reschedule

`/(tabs)/bookings` (My Bookings)
- [ ] Cancel a booking **more than 2h** before `scheduledStart` → cancel dialog shows the fixed reason picker (`NEED_HELP`/`TOOK_TOO_LONG_TO_CONFIRM`/`BOOKED_BY_MISTAKE`/`BOOKED_ELSEWHERE`/`OTHER`, "Other" reveals a free-text field) → succeeds, booking moves to Cancelled tab
- [ ] Attempt to cancel **inside** the 2h cutoff → blocked with a clear message (`409`, no exceptions) — this must not silently succeed
- [ ] Request a reschedule → original appointment still shown until the owner responds (not silently swapped)
- [ ] Owner proposes a reschedule instead → customer sees a respond-to-reschedule prompt and can Approve or Reject it (Module 15) — confirm the *other* party (not whoever proposed) is the one who gets the action buttons
- [ ] The non-proposing party accidentally tries to approve their own proposal → `404` (not a leaking error), not a crash

## 7. Payment

`/bookings/[bookingId]/pay` (only reachable once `AWAITING_PAYMENT`)
- [ ] Visiting for a booking that's already been paid → auto-redirects to `/bookings/[bookingId]/confirmed`, doesn't re-show the payment form
- [ ] Visiting for a booking that's `PENDING`/not yet `AWAITING_PAYMENT` → locked "not ready" state, not a broken payment form
- [ ] Complete a real Razorpay test payment (test card/UPI on Razorpay's own screen) → `/verify` called, success toast, redirected to `/confirmed`
- [ ] Open the widget then **dismiss it without paying** (close button) → toast shown, **and** confirm the payment attempt is actually cancelled server-side (`GET /payments/my-payments` shows it `FAILED`, not stuck `PENDING`) — this exercises the fix just made to `ondismiss`; retry immediately afterward and confirm `create-order` doesn't `409` you
- [ ] Try to open a second payment attempt while one is still genuinely pending → `409` with the "already in progress" message
- [ ] Submit a deliberately bad signature (or let `/verify` fail some other way) → payment marked `FAILED`, retry button works afterward

## 8. Reviews

`/bookings/[bookingId]/review`
- [ ] Only reachable/shown for a `COMPLETED` booking
- [ ] Submit ratings 1–5 across all categories + text → review created
- [ ] Try to review the same booking twice → blocked (`409`), reuses the existing review for edit instead
- [ ] Edit within 48h of the review's `createdAt` → succeeds
- [ ] Edit after 48h → blocked (`422`) — you may need to backdate a review's `createdAt` in the DB to actually hit this window in a fresh test run; otherwise mark N/A

`/reviews/salon/[salonId]`
- [ ] Public list loads without auth, aggregate rating computed correctly from shown rows
- [ ] Report a review → confirmation, reported state persists (no duplicate report on the same review)
- [ ] As the owning Salon Owner, reply to a review → reply thread updates

## 9. Wallet (`/profile/wallet`, Module 20)

- [ ] Balance shows `0` for a customer with no wallet activity (not a 404/error state)
- [ ] Transactions list shows CREDIT/DEBIT entries with reason (`BOOKING_PAYMENT`, `BOOKING_REFUND`, `REFUND_APPROVED`, `ADVANCE_FORFEITURE`), newest first
- [ ] A WALLET-paid booking that's later cancelled/rejected/expires unconfirmed → full amount auto-refunds back to wallet, new CREDIT row appears with no customer action needed
- [ ] Admin-approved refund (§11) → credits wallet, `REFUND_APPROVED` row appears

## 10. Claim a walk-in (`/bookings/claim`, Module 23)

- [ ] As Owner, create a walk-in booking (`/owner/bookings/walk-in`) for a fake phone/name, note the `bookingNumber` (e.g. `SLJ-...`)
- [ ] As a Customer, go to My Bookings → "Claim a Walk-in" (also in Profile menu) → enter that `bookingNumber` → success, booking now appears in the customer's My Bookings
- [ ] Claim the same `bookingNumber` again (same or a different customer) → `409` already claimed
- [ ] Claim an unknown/non-walk-in booking number → `404`
- [ ] Claim with "pay online" checked, for an unpaid `APPROVED` walk-in → switches it to `AWAITING_PAYMENT`/`ONLINE`, `/pay` flow works exactly as a normal online booking
- [ ] Claim without "pay online" → booking just links into My Bookings, still payable/settleable at the salon as before

## 11. Salon Owner — Salon & Branch

`/owner/salons/new` → `/owner/salons`
- [ ] Create a salon → shows pending-Admin-review state, not bookable yet
- [ ] `/owner/salons/[salonId]` → edit salon details; soft-delete a salon → disappears from the owner's list

`/owner/salons/[salonId]/branches/new` → `/owner/branches/[branchId]`
- [ ] Create a branch (chairs > 0, opening before closing enforced) → appears under the salon
- [ ] Add a holiday → later reflected in availability (no slots on that date)
- [ ] Set a capacity override → availability reflects the new max
- [ ] Gallery card: add/remove image URLs → reflected on the public `/salons/[branchId]` gallery
- [ ] Slot-templates card: add a template → `/book/[branchId]/slot` now generates slots per-template instead of the fixed 30-min interval; delete it → reverts to fixed interval

## 12. Salon Owner — Staff & Services

- [ ] Create staff (branch-scoped) → appears in branch staff list
- [ ] Add/cancel staff leave → affects `/book/[branchId]/stylist` eligibility for those dates
- [ ] Disable a staff member → no longer offered as a stylist option going forward
- [ ] Create a service (duration/price > 0 enforced) → appears in branch services, visible on public salon page once `ACTIVE`
- [ ] Assign/unassign staff to a service → reflected in stylist eligibility
- [ ] Add/edit/deactivate a service **variant** (Module 22) → reflected immediately in the public branch detail's `variants[]` and in Select Services

## 13. Salon Owner — Bookings

`/owner/bookings`
- [ ] Filter by status (PENDING/APPROVED/COMPLETED/CANCELLED)
- [ ] Approve a PENDING booking → moves to APPROVED, customer notified
- [ ] Reject a PENDING booking (reason required) → moves to CANCELLED/rejected state, reason visible
- [ ] Propose a reschedule → customer sees it pending their response (§6)
- [ ] Mark an APPROVED booking NO_SHOW **before** its scheduled start → blocked (`400`, too early); **at/after** start → succeeds, records a strike
- [ ] Create a walk-in (`/owner/bookings/walk-in`) with a required `staffId` → booking created straight to APPROVED, consumes capacity

## 14. Salon Owner — Promotions & Analytics

`/owner/promotions`
- [ ] Create a promotion targeting one or more branches/services with a date range → shows on the public branch detail's promotions list while active, disappears once `endsAt` passes
- [ ] Flag one `featured` → that branch's **listing card** (Explore/Home) shows the offer banner (§3); un-flag it → banner disappears from the card (detail page's full list is unaffected either way)

`/owner/salons/[salonId]` analytics card
- [ ] Stat numbers match reality for a chosen date range (bookings/completed/cancelled/no-show/revenue)
- [ ] `averageRating`/`reviewCount` stay the same regardless of the date range picked (they're not date-scoped, by design)

## 15. Admin

`/admin/salons`
- [ ] Pending queue shows newly created salons
- [ ] Verify → salon becomes publicly bookable; Reject (reason required) → stays hidden; Suspend an already-verified salon (reason required) → goes offline immediately, existing bookings unaffected but no new ones bookable; Reactivate → back online
- [ ] Owner receives an email/notification on every decision (check backend console log if no real SMTP)

`/admin/refunds`
- [ ] Filter by status; open a refund → shows embedded booking/payment/customer context, no extra lookup needed
- [ ] Approve → credits customer wallet (§9), marks COMPLETED; Reject (reason required) → marks REJECTED
- [ ] Acting twice on the same refund → `409` (already decided)

`/admin/complaints`
- [ ] Filter by status; Resolve (notes required) / Reject (reason required) on an OPEN complaint
- [ ] Acting on an already-resolved/rejected complaint → `409`
- [ ] (No filing UI exists — file one via API first if you need a row to test against)

`/admin/reports`
- [ ] Overview stat grid loads; change the date range → booking/revenue counts change accordingly, but salon/complaint/refund queue counts stay as live totals regardless of range (by design, not a bug)

---

## 16. Cross-role scenarios (do these with the multi-window setup from §0)

- [ ] Customer A books → Owner sees it in the PENDING queue within a few seconds (no manual refresh needed, or refresh reveals it) → Owner approves → Customer A's booking flips to APPROVED and a "Pay Now" affordance appears
- [ ] Customer A pays → Owner's booking list reflects payment status change if shown; Admin's `/admin/reports` totalRevenue increases on next load
- [ ] Owner marks 4 no-shows for Customer A across separate bookings → Customer A's next PAY_AT_SALON booking requires the advance (§5) without any admin action needed
- [ ] Admin suspends the salon mid-flow (after Customer A has a PENDING booking with it) → confirm existing booking isn't silently cancelled, but no *new* booking can be started against that branch
- [ ] Owner creates a walk-in → Customer B claims it by `bookingNumber` → Owner's booking list shows it linked to Customer B, not anonymous anymore
- [ ] Two customers race for the last slot on the same branch/date/time → one gets the booking, the other gets `409` + refreshed slots, never a double-booked confirmation on both sides

---

## Result log

| Section | Pass / Fail | Notes |
|---|---|---|
| 1. Auth | | |
| 2. Profile & Addresses | | |
| 3. Browse | | |
| 4. Booking creation | | |
| 5. Strikes / advance payment | | |
| 6. Cancellation & reschedule | | |
| 7. Payment | | |
| 8. Reviews | | |
| 9. Wallet | | |
| 10. Claim a walk-in | | |
| 11. Owner — Salon & Branch | | |
| 12. Owner — Staff & Services | | |
| 13. Owner — Bookings | | |
| 14. Owner — Promotions & Analytics | | |
| 15. Admin | | |
| 16. Cross-role scenarios | | |
