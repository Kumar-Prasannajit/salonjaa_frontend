# Salonjaa Frontend

Customer-facing web app for the Salonjaa salon discovery/booking platform. Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v4 + shadcn/ui (Radix primitives), email-OTP auth against the backend.

## Read these before writing any code

1. **`../frontend_handover.md`** (project root — moved here from `salonjaa-backend/docs/` so both repos read the same file instead of two copies drifting apart) — the API contract source of truth: routes, request bodies, response shapes, auth requirements, and a 🟢 Live / ⚪ Not built status per section. Build only what's marked 🟢 Live.
2. **`../PROGRESS.md`** (project root) — what the backend actually has built and tested right now, module by module. If a screen needs an endpoint that isn't in a "Done and tested" module here, it can't be wired up yet — see "Scope" below.
3. **`docs/designs/`** — the mobile design screenshots (`01-auth-screen.jpeg` … `12-user-bookings.jpeg`, plus `light_mode_all_pages.jpeg` — the light-theme variant of all 12). Reference these before building or restyling any screen.
4. **`docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md`** — a not-yet-implemented contract this frontend drafted for the backend to build, since no public/customer endpoint exists anywhere to list or read a salon/branch/service today (every `GET /salons`, `/branches`, `/services` route is Salon-Owner-scoped). Home, Explore, Salon Details, and Select Services are blocked on this shipping. Also covers a second, smaller gap found while building My Bookings: booking responses carry `salonId`/`branchId`/`selectedStaffId` but never a resolved name.
5. **`../KNOWN_BACKEND_LIMITATIONS.md`** (project root) — behavioral gaps in currently-live endpoints found while building (coupons can never actually attach to a booking; a payment left open in the Razorpay widget can never be retried). Not missing endpoints like the file above — real constraints of how the live ones behave.
6. **`../bug_inventory.md`** (project root) — the live, shared cross-repo bug tracker from manual QA passes. Check here before assuming a behavior is correct or re-investigating something already found.

## Tech stack decisions

- **Tailwind v4 + shadcn/ui, Radix base.** Theme lives entirely in `app/globals.css` as CSS variables — no `tailwind.config.ts` (v4 doesn't need one). **Two themes now**: `docs/designs/light_mode_all_pages.jpeg` supplied a full light re-skin of every screen, so this is a real light/dark system — `:root` holds the light palette (default), `.dark` overrides it. Toggled via `next-themes` (class strategy, `defaultTheme="dark"` since the brand's primary identity is the dark+gold look, `enableSystem` so OS preference is still honored when no explicit choice is stored) — see `components/theme-provider.tsx` (wraps `next-themes` in `app/layout.tsx`) and `components/theme-toggle.tsx` (icon button in the tabs shell header, persisted to `localStorage` by `next-themes` itself). No design specifies where the toggle control lives — it was placed in the shell header as the most discoverable always-on spot; revisit if a design ever shows one explicitly.
- **Fonts via `next/font/google`** (`app/layout.tsx`): DM Sans (`--font-sans`) and DM Mono (`--font-mono`), self-hosted rather than the external `@import url(fonts.googleapis.com...)` the app originally used. Playfair Display was dropped — the designs use a plain UI sans everywhere; the "SALONJAA" wordmark is a logo graphic, not live text in a display serif.
- **Real routing (App Router), introduced once the flow grew past a single screen.** The `(tabs)` route group (`app/(tabs)/layout.tsx`) renders the shared header + `BottomNav` around the 5 bottom-nav destinations (`/`, `/bookings`, `/explore`, `/offers`, `/profile`); everything else (booking-flow drill-ins, `/profile/addresses`) lives outside that group with no tab bar, matching how those screens are drawn in the designs (full-screen with a back arrow, not a persistent tab bar).
- **Browsing is anonymous; auth is deferred to checkout.** A customer can browse Home → Explore → Salon Details → Select Services → Choose Stylist → Choose Slot without signing in. `AuthScreen` no longer gates the whole app — it renders inline on `/profile` when signed out, and a compact variant (`components/checkout-auth-step.tsx`) renders again at Checkout, right before `POST /bookings`. If `GET /users/me` comes back with no `name`, `components/checkout-basic-details-step.tsx` collects it (`PATCH /users/me`) as one extra step first.
- **`useAccount()` is hoisted into a context** (`hooks/account-context.tsx`, `AccountProvider`/`useAccountContext`) at the root layout, not called once inside a single page component — necessary since Profile, Saved Addresses, Checkout, and My Bookings are all separate routes that need the same session state without prop-drilling.
- **`useBookingDraft()` context** (`hooks/booking-draft-context.tsx`) holds the in-progress browse-to-book selection (branch/salon, services, stylist, slot), set by `app/salons/[branchId]/services/page.tsx` (Select Services) and carried across `/book/[branchId]/*` routes — nothing here persists server-side until Checkout's `POST /bookings` actually creates the booking. Lost on reload, same tradeoff as the auth tokens.
- **Public Browse (Home/Explore/Salon Details/Select Services) never fabricates a location name or a discount.** `GET /public/branches`'s `distanceKm` only appears once real coordinates are sent, sourced from the browser's own Geolocation API (`hooks/use-geolocation.ts`) behind an explicit "Use my location" action — there's no geocoding endpoint to turn that into "Banjara Hills"-style text, so no screen tries to. The heart/favourite icon the designs show is still omitted outright — no source of truth for it anywhere. The literal "20% OFF" discount badge is **no longer a pure omission**: Module 21 added real (if differently-shaped) listing-card signals — `priceTier` (₹/₹₹/₹₹₹, computed server-side), `genderServed` (owner-set), and `activePromotion` (owner-flagged `featured` promotion banner) — rendered as badges in `components/salon-card.tsx` and `app/salons/[branchId]/page.tsx` (minus `activePromotion`, which is listing-card only) instead of a fabricated percentage.
- **A customer cannot pay immediately after booking.** `POST /payments/create-order` requires the booking to already be `APPROVED` by the salon (`../PROGRESS.md`'s Module 7 note: "if salon owner approves then customer will pay"). So Checkout's CTA is "Confirm Booking Request", not "Proceed to Payment" as the design literally shows — real payment is a separate later action (`components/booking-card.tsx`'s "Pay Now", shown only on `APPROVED` bookings in My Bookings). Don't reintroduce an immediate pay-at-checkout flow without a corresponding backend change.
- **A validated coupon is actually applied (BUG-005 fix).** `POST /payments/coupons/validate` previews the discount; once valid, Checkout sends the same `couponCode` on `POST /bookings`, which snapshots a real `discountAmount` onto the booking. The summary card shows Subtotal/Discount/Total accordingly — editing the coupon code after validating clears the applied state so a stale code can't slip through on submit.
- **Bookings have no resolved salon/branch/staff names** (see `docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md`'s second section) — `components/booking-card.tsx` uses the booking's own `bookingNumber` as its title instead of a salon name/photo, and omits the professional's name entirely rather than showing a raw UUID.
- **Real Razorpay Standard Checkout integration** (`lib/razorpay.ts`) — the widget script loads from Razorpay's own CDN at call time (their documented integration, not something to swap for a bundled copy). `POST /payments/create-order` returns `amount` in rupees; Razorpay's checkout options need paise, so `app/bookings/[bookingId]/pay/page.tsx` multiplies by 100 itself — don't skip that conversion. Needs `NEXT_PUBLIC_RAZORPAY_KEY_ID` set (see "Environment" below) or the widget fails to load.
- **`bookingStatus` never reflects payment.** There's no `AWAITING_PAYMENT` state — an `APPROVED` booking stays `APPROVED` even after a successful payment. So "has this been paid" is answered by cross-referencing `GET /payments/my-payments` (`components/booking-card.tsx`'s `paid` prop, computed in `app/(tabs)/bookings/page.tsx`), not by booking status alone. Both the pay and confirmed pages independently re-check this (via the same endpoint) before showing their content, so landing on either page directly with no real payment doesn't show a false state.
- **A payment left open in the Razorpay widget (closed without completing) can't be retried today** — the payment row stays `PENDING` forever (no webhook, no timeout), and `POST /payments/create-order` only allows a retry once a payment is `FAILED`. This is a real backend gap, not a frontend bug; `pay/page.tsx`'s `ondismiss` notice says so rather than implying retry always works.
- **No "my reviews" or "review status for this booking" endpoint exists** — whether a completed booking already has a review (and, if so, its `reviewId` for editing) is discovered by fetching the public `GET /reviews/salon/:salonId` list and matching on `bookingId` (`app/bookings/[bookingId]/review/page.tsx`). This is real data via a real live endpoint, not a workaround around missing auth — don't add a fabricated "my reviews" cache instead.
- **A salon's public review list (`app/reviews/salon/[salonId]/page.tsx`) is reachable without the blocked browse contract** — any known `salonId` (from a booking) is enough; it doesn't need Salon Details to exist first. The aggregate rating shown there is computed client-side from the same rows, not a fabricated summary field the API doesn't return.

## Folder structure

```text
app/
  layout.tsx, globals.css        # root: fonts, ThemeProvider, AccountProvider, BookingDraftProvider
  (tabs)/
    layout.tsx                    # shared header + BottomNav
    page.tsx                      # "/"        Home            — docs/designs/02, GET /public/branches + GET /service-categories
    explore/page.tsx              # "/explore" Explore/search  — docs/designs/04, GET /public/branches, reads q/serviceCategoryId from the URL
    bookings/page.tsx             # "/bookings" My Bookings    — tabs (Upcoming/Completed/Cancelled), cancel action
    offers/page.tsx               # "/offers"  Offers          — placeholder, no contract at all
    profile/page.tsx              # "/profile" AuthScreen (signed out) or ProfileMenu (signed in)
  profile/
    addresses/page.tsx            # "/profile/addresses" — no tab bar; redirects to /profile if signed out
  salons/[branchId]/
    page.tsx                       # docs/designs/03 — GET /public/branches/:branchId
    services/page.tsx              # docs/designs/05 — same endpoint's embedded services[]; Next hands off into useBookingDraft().setServices(), the real entry into Modules 4-7
  book/
    [branchId]/
      stylist/page.tsx              # docs/designs/06 — GET /availability/staff
      slot/page.tsx                 # docs/designs/07 — SlotPicker + GET /availability/slots
      checkout/page.tsx             # docs/designs/08 — auth/basic-details steps, coupon preview, POST /bookings
      requested/page.tsx            # honest pending-approval state (not the literal "Booking Confirmed" design 10)
  bookings/[bookingId]/
    reschedule/page.tsx             # POST /bookings/:id/reschedule-request, reuses SlotPicker
    pay/page.tsx                    # docs/designs/09 — Razorpay Standard Checkout, only for APPROVED bookings
    confirmed/page.tsx              # docs/designs/10 — only reachable once a SUCCESS payment actually exists
    review/page.tsx                 # POST /reviews (create) or PATCH /reviews/:id (edit) — only for COMPLETED bookings
  reviews/salon/[salonId]/page.tsx  # public GET /reviews/salon/:salonId listing + report action
components/
  ui/                # shadcn-generated primitives — don't hand-edit, re-run `npx shadcn add` instead
  auth-screen.tsx, profile-menu.tsx, address-list.tsx, address-form-dialog.tsx,
  theme-provider.tsx, theme-toggle.tsx, bottom-nav.tsx, coming-soon.tsx,
  slot-picker.tsx, checkout-auth-step.tsx, checkout-basic-details-step.tsx,
  booking-card.tsx, cancel-booking-dialog.tsx, star-rating.tsx, report-review-dialog.tsx,
  salon-card.tsx      # one GET /public/branches row, `variant: "grid" | "row"` — Home's horizontal scroll vs. Explore's list
hooks/
  use-account.ts        # all state + handlers for the Auth/Profile/Address flow
  account-context.tsx    # React context wrapping useAccount() for use across routes
  booking-draft-context.tsx  # client-side browse-to-book selection state
  use-geolocation.ts     # thin wrapper around navigator.geolocation — real device coords for GET /public/branches's distance sort, never auto-requested
lib/
  api-client.ts        # see "API calls" below
  types.ts             # User / Address / AddressFormValues / Booking / BookingDetail / Payment / Review / availability & coupon / public-browse types
  utils.ts             # shadcn's cn() helper, date/time formatting, downloadBookingICS
  razorpay.ts          # Standard Checkout widget loader + open() wrapper
docs/
  designs/                              # mobile design screenshots, numbered 01-12 + light_mode_all_pages
  PROPOSED_PUBLIC_BROWSE_CONTRACT.md    # drafted, not yet implemented — see above
# KNOWN_BACKEND_LIMITATIONS.md, PROGRESS.md, frontend_handover.md, context.md, TRD.md,
# bug_inventory.md, changelog.md now live at the project root, one level up — shared
# across both repos instead of living inside this one.
```

## API calls go through `lib/api-client.ts` — no exceptions

`lib/api-client.ts` is the only file that knows `NEXT_PUBLIC_API_URL`, attaches the `Authorization` header, and retries once on a 401 after refreshing the access token. Every component and hook calls `apiFetch()` from there — never `fetch()` directly. Tokens live in memory only (module-level, not `localStorage`), so a full page reload signs the user out; that's an existing gap carried over from before this refactor, not something to silently fix — flag it instead if it needs to change.

## Scope: what's actually built vs. what the designs show

Backend is far along now (see `../PROGRESS.md`): Auth, User+Address, Salon+Branch, Staff+Services, Public Browse, Availability+Booking, Payment+Coupon, Reviews are all 🟢 Live; Admin is partial. Public Browse (Module 10 — `GET /public/branches`, `GET /public/branches/:branchId`, `GET /service-categories`) shipped after `docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md` was drafted here, so Home (`02`), Nearby Salons (`04`), Salon Details (`03`), and Select Services (`05`) are all built against it now — no more `ComingSoon` placeholders. The contract's own dropped items stay dropped where nothing since backs them: no heart/favourite icon (still no source of truth). The designs' "20% OFF" discount badge is different now — Module 21 added `priceTier`/`genderServed`/`activePromotion` to the listing/detail responses, rendered as real badges instead of a fabricated percentage (see `components/salon-card.tsx`). There's also still no geocoding endpoint, so nowhere shows a typed place name ("Banjara Hills") — distance sort uses real browser Geolocation coordinates instead (`hooks/use-geolocation.ts`), never auto-requested.

Choose Stylist (`06`), Choose Slot (`07`), Checkout (`08`), Payment (`09`), Booking Confirmed (`10`), My Bookings (`12`), and Reviews (not in the numbered designs — Module 8) were already built against live endpoints and needed no changes here.

The Profile menu's disabled rows (My Wallet, Payment Methods, Refer & Earn, Help & Support, Settings) and the Offers tab stay disabled/placeholder for the same reason: **don't wire disabled or placeholder screens to fake data or invented endpoints.** Build them out only once their backend module ships and `../frontend_handover.md` documents the contract.

Two fields the Profile design leans on — phone number and profile photo — are read-only placeholders (`user?.phone`, no avatar image) because `GET /users/me` returns both but `PATCH /users/me` has no way to ever set either one. Don't fabricate values for them; if a write-path for these ships later, wire it up then.

## Common commands

```bash
npm run dev      # next dev
npm run build     # next build (also runs ESLint)
npm run start     # next start
npm run lint      # eslint . (next lint is deprecated as of Next 15.5, removed in 16)
npx shadcn add <component>   # add another shadcn/ui component
```

## Environment

Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api/v1` if unset) — a running instance of `../salonjaa-backend`.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — must match the backend's `RAZORPAY_KEY_ID` (its `.env`). This is Razorpay's public `key_id`, not the secret — safe client-side, same trust model as a Stripe publishable key. Payment (`app/bookings/[bookingId]/pay`) fails to load the checkout widget without it.
