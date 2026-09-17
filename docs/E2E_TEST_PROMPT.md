# Prompt: merge everything, then run the full E2E test live

Paste the block below into a Claude Code session running in `Salonjaa_Frontend`
(with the `claude-in-chrome` browser tools available) to do the integration
merge and then drive the actual live test through the checklist.

---

```
You're working in Salonjaa_Frontend. Backend lives at ../salonjaa-backend.

GOAL: get every shipped module running together in one browser session, then
manually + visually walk every customer/owner/admin flow end-to-end using
Chrome, checking off user-test.md (repo root) as you go, fixing any real bugs you
find (not documented contract gaps — flag those to me instead of inventing a
fix, per this repo's own CLAUDE.md rule about not building ahead of contract).

STEP 1 — Merge the 8 pending module branches into one integration branch.
They currently sit independently off owner-admin-dashboards, none merged:
module-15-reschedule-response, module-16-cancellation-strikes-advance,
module-17-owner-dashboard, module-19-browse-booking-fields, module-20-wallet,
module-21-listing-card-signals, module-22-service-variants,
module-23-claim-walkin.

- Create `integration/full-e2e` off the current tip of `owner-admin-dashboards`
  (it already carries a fix for the payment ondismiss/cancel wiring bug — keep it).
- `git merge` each of the 8 branches into it ONE AT A TIME, in this order:
  15, 16, 17, 19, 20, 21, 22, 23.
- Expect real conflicts in app/bookings/[bookingId]/pay/page.tsx (multiple
  branches, and the base branch's ondismiss fix, all touch it),
  app/(tabs)/bookings/page.tsx, components/booking-card.tsx, and lib/types.ts —
  resolve each by keeping BOTH sides' features (don't silently drop one
  branch's work to resolve a conflict). After each merge: `npx tsc --noEmit`,
  `npx eslint .`, `npm run build` — all three clean before merging the next
  branch. If a merge breaks something non-trivial, stop and tell me rather
  than guessing at a fix.
- Module 22 (service variants) is flagged as the one contract-breaking change
  (services[] array shape) — pay extra attention that whatever merges after
  it still sends the right shape.

STEP 2 — Environment.
- Confirm Docker Desktop/Redis is running (BullMQ jobs need it — payment
  expiry, booking expiry, strike checks all silently no-op without it).
- Backend: .env filled in, npm run db:migrate, npm run db:seed, npm run dev.
- Frontend: .env.local with NEXT_PUBLIC_API_URL and a Razorpay TEST key_id
  matching backend's, npm run dev.
- Create the 4 test accounts and grant roles exactly as described in
  user-test.md §0 (customer.a, customer.b, owner, admin — the OTP prints to
  the backend terminal, there's no real email).

STEP 3 — Run user-test.md (repo root) top to bottom, using Chrome via
claude-in-chrome. Remember auth is cookie-based and shared per browser
profile — use separate windows/profiles per simultaneous role exactly as
§0 describes, not just plain tabs of the same profile, or roles will stomp
each other's session. For each checklist item: navigate, perform the action,
screenshot or read the page to confirm the Expect condition, and report which
items pass/fail — don't just claim a section passed without actually having
navigated to it in this session.

For every failure found: fix it if it's a real bug in already-documented
frontend behavior; if it looks like a genuine backend contract gap or an
undecided policy (check `../../context.md`'s Pending Decisions and
`../../KNOWN_BACKEND_LIMITATIONS.md` first — both now at the project root,
shared with the backend repo), don't invent a workaround — write it
up instead the same way KNOWN_BACKEND_LIMITATIONS.md's existing entries are
written (what's expected, what actually happens, why).

STEP 4 — When done, give me: which checklist sections fully passed, which
had failures (with what you fixed vs. what you're flagging as a backend/
contract gap), and the final commit(s) with typecheck/lint/build all green.
```
