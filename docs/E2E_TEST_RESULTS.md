# Full E2E Test Results — `integration/full-e2e`

Manual end-to-end test pass of `user-test.md` (all 16 sections + setup), run live against a real backend
instance (`../salonjaa-backend`, Docker/Redis/BullMQ up) and a real Razorpay test-mode integration, using
Chrome browser automation plus direct API calls for setup/verification. Every item below was actually
navigated to and exercised — nothing here is inferred from reading code alone unless explicitly marked as such.

**Bottom line: all 16 sections pass.** 9 real frontend bugs were found and fixed (commits below, all with
clean `tsc`/`eslint`/`build`). 5 real backend gaps were found and documented in
[`KNOWN_BACKEND_LIMITATIONS.md`](./KNOWN_BACKEND_LIMITATIONS.md) rather than worked around — 3 are backend
bugs that need a backend fix, 2 are missing frontend screens for endpoints the backend already ships live.

## How to read this

- ✅ = verified pass, live, with a specific reproduction noted.
- 🔧 = a bug was found here and is now fixed (frontend, this repo).
- 🚩 = a gap was found and flagged, not fixed (needs backend work or a product decision) — see the
  "Backend gaps" section for the full list and the standalone backend prompt.

## Section-by-section

**1. Auth** — ✅ all 6 items (send/verify OTP, wrong-OTP error, resend cooldown, reload-persists-session,
sign-out). Reload-persistence is real (cookie-based `/auth/refresh-token` restore on mount) even though a
CLAUDE.md comment claims otherwise — a stale doc, not a bug.

**2. Profile & Addresses** — ✅ all items. 🔧 Found: a hard reload on `/profile/addresses`, `/profile/wallet`,
or `/bookings/claim` bounced a genuinely signed-in user back to `/profile` because the redirect guard fired
before the async cookie-restore completed. Fixed with an `authChecked` flag (`hooks/use-account.ts`) gating
all three redirects.

**3. Browse** — ✅ all items reachable from seed data. One chip category legitimately has 0 seeded services
(confirmed via API across all 8 categories) — correct empty state, not a bug. Gender-served tags and
promotion banners couldn't be exercised from seed data alone; confirmed later once §11/§14 created real data
for them.

**4. Booking creation** — ✅ full pass including Module 22 variant selection and a staff-on-leave conflict
correctly blocked at submit time (`GET /availability/slots` has no staff filter by documented design, so this
is caught at creation, not slot-list time — not a bug). An earlier booking's real auto-expiry (BullMQ/Redis)
was observed, confirming the background jobs are genuinely running in this environment.

**5. Strikes / advance payment** — ✅ full lifecycle verified with real transactions: 4 recorded NO_SHOW
strikes → next `PAY_AT_SALON` booking requires a 10% advance → owner blocked with a 409 pre-payment → advance
paid via real Razorpay → owner approves → an ONLINE booking for the same restricted customer correctly skips
the advance (no double-charge) → cancelling an advance-paid booking correctly forfeits it to the customer's
wallet (`ADVANCE_FORFEITURE` credit, verified). 🔧 Found: an approved `PAY_AT_SALON` booking with only its
advance paid showed a plain "Paid" badge, indistinguishable from a fully-paid booking, even though most of
the total was still due at the salon — fixed to show "Advance Paid — ₹X due at salon".

**6. Cancellation & reschedule** — ✅ all items: free cancel with the reason picker, the 2-hour cutoff blocked
both client-side (no request fires) and server-side (409, independently confirmed), a customer-initiated
reschedule request/owner-accept round trip, an owner-initiated propose/customer-accept round trip, and the
proposer being correctly blocked (404, non-leaking) from approving their own proposal.

**7. Payment** — ✅ full real-money-flow verified via Razorpay test mode: successful payment → booking
`APPROVED` + payment `SUCCESS`; dismiss-without-paying → `FAILED` (not stuck `PENDING`) → retry → `SUCCESS`,
correct payment history on both rows; sequential double-payment-attempt → clean 409. 🚩 Found: *concurrent*
`create-order` calls (two requests racing) both succeed, creating two live Razorpay orders for one booking —
a real backend race condition, not reachable from this frontend's own UI (the Pay button disables itself), so
flagged rather than worked around. Bad-signature failure path isn't independently reachable without forging a
signature, which real browser automation can't do — skipped, not faked.

**8. Reviews** — ✅ create/edit/report/no-duplicate all verified with real data. 🚩 Owner-reply: no frontend
UI exists anywhere for the live `POST /reviews/:reviewId/reply` endpoint. Worse, calling it directly revealed
a **real backend bug**: `review.service.ts`'s `listBySalon`/`listByStaff`/`listByService` never fetch reply
data at all, so a reply is genuinely persisted and returned by the write endpoint but invisible through every
list a customer could ever see — the frontend's existing `r.reply && (...)` rendering is correct code sitting
on top of a response that never carries the data.

**9. Wallet** — ✅ balance and transaction list verified with real `CREDIT` rows (`ADVANCE_FORFEITURE`,
`REFUND_APPROVED`) in correct newest-first order. 🔧 Found: `GET /wallet`'s envelope (`{data: {balance}}`) was
being read as if bare (`{balance}`), so the balance was always `undefined` and the Checkout wallet-payment
option was permanently disabled regardless of real balance. Fixed at both call sites.

**10. Claim a walk-in** — ✅ full pass: claim by booking number, already-claimed 409, unknown-number 404, and
the "pay online" checkbox correctly switching an unpaid `APPROVED` walk-in to `AWAITING_PAYMENT`/`ONLINE`
followed by a real completed payment.

**11. Owner — Salon & Branch** — ✅ full pass. 🔧 Found: the branch-edit form was missing the `genderServed`
field entirely (backend fully supported it) — added. 🔧 Found: saving the branch-edit form for *any* reason
400'd unless both time fields were re-picked, because the API returns `"HH:MM:SS"` but the PATCH validator
requires exactly `"HH:MM"` — fixed with a truncation helper. Holidays and capacity overrides were both
cross-checked against real `GET /availability/slots` output (not just the form's own success toast) and
genuinely change availability.

**12. Owner — Staff & Services** — ✅ full pass. 🔧 Found: Module 22's owner-facing service-variant CRUD (the
backend has lived endpoints for it) had no frontend UI at all — built a full "Variants" management panel from
scratch (add/deactivate/reactivate/remove), verified end-to-end against the public branch detail's
`variants[]`.

**13. Owner — Bookings** — ✅ filter tabs, approve, reject, no-show timing (blocked before scheduled start,
succeeds at/after), and walk-in creation all verified.

**14. Owner — Promotions & Analytics** — ✅ promotion create and the `featured` flag both verified against the
listing-card banner and the branch detail list. 🔧 Found: the Salon Details page never rendered the branch's
promotions at all, despite the live endpoint working correctly — added the fetch and card section.

**15. Admin** — ✅ full pass: salon verify/reject/suspend/reactivate (with real notification emails logged),
refund approve/reject, complaint resolve + already-resolved 409, reports overview with genuinely live
(non-fabricated) numbers. 🔧 Found: the refund-approve confirmation dialog said "no money moves automatically"
— stale copy from before Module 20 made approval actually credit the customer's wallet (verified live:
₹0→₹299 via a real `REFUND_APPROVED` credit). Fixed the copy and two related stale comments.

**16. Cross-role scenarios** — ✅ all 6, including a genuine two-session race condition test (two real
customer sessions racing `POST /bookings` for the same last slot via distinct bearer tokens, not simulated
sequentially) — one got `201`, the other a clean `409`, no double-booking. Admin-suspend-mid-flow correctly
leaves an existing booking untouched while blocking new ones. 🚩 Found: a claimed walk-in's `customerId`
genuinely transfers to the claiming customer, but `customerName`/`customerPhone` never update — so the owner
can never tell a still-anonymous walk-in apart from one a real customer claimed. Backend gap, not fixed here.

## Bugs found and fixed this pass (frontend, this repo)

All verified with a live before/after reproduction, not just code review. `npx tsc --noEmit`, `npx eslint .`,
and `npm run build` all clean after every fix.

1. Auth-guard reload-redirect race (`hooks/use-account.ts` + 3 pages) — commit in this branch's history.
2. `GET /wallet` envelope mismatch (`app/profile/wallet/page.tsx`, `app/book/[branchId]/checkout/page.tsx`).
3. Branch-edit form missing `genderServed` (`lib/types.ts`, `components/owner/branch-info-card.tsx`).
4. Branch-edit form 400s unless time fields are re-picked (`components/owner/branch-info-card.tsx`).
5. Owner-side service-variant CRUD entirely missing — built (`components/owner/service-manager.tsx`).
6. Salon Details page never showed promotions — built (`app/salons/[branchId]/page.tsx`).
7. **[High impact]** `apiFetch`'s 401-retry never fired without an in-memory token, surfacing raw backend 401s
   on any page loaded via hard reload before the session restore completed (`lib/api-client.ts`).
8. Admin refund-approve dialog had stale "no money moves" copy (commit `316ee4d`).
9. An advance-only-paid `PAY_AT_SALON` booking showed a misleading plain "Paid" badge (commit `5ec8026`).

## Backend gaps found and documented, not fixed here

Full detail in [`KNOWN_BACKEND_LIMITATIONS.md`](./KNOWN_BACKEND_LIMITATIONS.md). Summary:

1. **`POST /payments/create-order` race condition** — concurrent calls both succeed, producing two live
   Razorpay orders for one booking. Needs a DB unique constraint or transaction lock.
2. **Review replies invisible in every list view** — `review.service.ts`'s list queries never fetch reply
   data. Needs a join/fetch fix in `toDTOList()`.
3. **Claimed walk-ins keep showing anonymous placeholder name/phone** — `claimBooking()` only updates
   `customerId`, never clears/updates `customerName`/`customerPhone`. Needs either a null-out on claim or a
   `claimedAt`/`claimedBy` field.
4. **No frontend UI for `POST /payments/refund-request`** (live, customer-facing) — needs a product/design
   decision on placement, then frontend work (this repo, once decided).
5. **No frontend UI for `POST /reviews/:reviewId/reply`** (live, `SALON_OWNER`-only) — same, frontend work
   once gap #2 above is fixed (no point building UI for replies that can't be seen).

Gaps #1–#3 need a backend engineer/session. Gaps #4–#5 are frontend work for this repo, best done once #2/#3
are fixed so the new UI has correct data to work with.
