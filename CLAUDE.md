# Salonjaa Frontend

Customer-facing web app for the Salonjaa salon discovery/booking platform. Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v4 + shadcn/ui (Radix primitives), email-OTP auth against the backend.

## Read these before writing any code

1. **`../salonjaa-backend/docs/frontend_handover.md`** — the API contract source of truth: routes, request bodies, response shapes, auth requirements, and a 🟢 Live / ⚪ Not built status per section. Build only what's marked 🟢 Live. **This repo's own root `frontend_handover.md` is a stale Aug-26 snapshot — don't read it, it predates almost everything the backend has since shipped.**
2. **`../salonjaa-backend/docs/PROGRESS.md`** — what the backend actually has built and tested right now, module by module. If a screen needs an endpoint that isn't in a "Done and tested" module here, it can't be wired up yet — see "Scope" below.
3. **`docs/designs/`** — the mobile design screenshots (`01-auth-screen.jpeg` … `12-user-bookings.jpeg`, plus `light_mode_all_pages.jpeg` — the light-theme variant of all 12). Reference these before building or restyling any screen.
4. **`docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md`** — a not-yet-implemented contract this frontend drafted for the backend to build, since no public/customer endpoint exists anywhere to list or read a salon/branch/service today (every `GET /salons`, `/branches`, `/services` route is Salon-Owner-scoped). Home, Explore, Salon Details, and Select Services are blocked on this shipping.

## Tech stack decisions

- **Tailwind v4 + shadcn/ui, Radix base.** Theme lives entirely in `app/globals.css` as CSS variables — no `tailwind.config.ts` (v4 doesn't need one). **Two themes now**: `docs/designs/light_mode_all_pages.jpeg` supplied a full light re-skin of every screen, so this is a real light/dark system — `:root` holds the light palette (default), `.dark` overrides it. Toggled via `next-themes` (class strategy, `defaultTheme="dark"` since the brand's primary identity is the dark+gold look, `enableSystem` so OS preference is still honored when no explicit choice is stored) — see `components/theme-provider.tsx` (wraps `next-themes` in `app/layout.tsx`) and `components/theme-toggle.tsx` (icon button in the tabs shell header, persisted to `localStorage` by `next-themes` itself). No design specifies where the toggle control lives — it was placed in the shell header as the most discoverable always-on spot; revisit if a design ever shows one explicitly.
- **Fonts via `next/font/google`** (`app/layout.tsx`): DM Sans (`--font-sans`) and DM Mono (`--font-mono`), self-hosted rather than the external `@import url(fonts.googleapis.com...)` the app originally used. Playfair Display was dropped — the designs use a plain UI sans everywhere; the "SALONJAA" wordmark is a logo graphic, not live text in a display serif.
- **Real routing (App Router), introduced once the flow grew past a single screen.** The `(tabs)` route group (`app/(tabs)/layout.tsx`) renders the shared header + `BottomNav` around the 5 bottom-nav destinations (`/`, `/bookings`, `/explore`, `/offers`, `/profile`); everything else (booking-flow drill-ins, `/profile/addresses`) lives outside that group with no tab bar, matching how those screens are drawn in the designs (full-screen with a back arrow, not a persistent tab bar).
- **Browsing is anonymous; auth is deferred to checkout.** Decided this session: a customer can browse Home → Explore → Salon Details → Select Services → Choose Stylist → Choose Slot without signing in. `AuthScreen` no longer gates the whole app — it now renders inline on `/profile` when signed out, and will render again (or via a shared step) right before `POST /bookings` at Checkout once Module 5 is built. If `GET /users/me` comes back with no `name`, collect basic details (`PATCH /users/me`) as one extra step before payment.
- **`useAccount()` is hoisted into a context** (`hooks/account-context.tsx`, `AccountProvider`/`useAccountContext`) at the root layout, not called once inside a single page component — necessary once Profile, Saved Addresses, and (later) checkout are separate routes that all need the same session state without prop-drilling.

## Folder structure

```text
app/
  layout.tsx, globals.css        # root: fonts, ThemeProvider, AccountProvider
  (tabs)/
    layout.tsx                    # shared header + BottomNav
    page.tsx                      # "/"        Home            — placeholder, blocked on browse contract
    explore/page.tsx              # "/explore" Explore/search  — placeholder, blocked on browse contract
    bookings/page.tsx             # "/bookings" My Bookings    — placeholder, Module 7
    offers/page.tsx               # "/offers"  Offers          — placeholder, no contract at all
    profile/page.tsx              # "/profile" AuthScreen (signed out) or ProfileMenu (signed in)
  profile/
    addresses/page.tsx            # "/profile/addresses" — no tab bar; redirects to /profile if signed out
components/
  ui/                # shadcn-generated primitives — don't hand-edit, re-run `npx shadcn add` instead
  auth-screen.tsx, profile-menu.tsx, address-list.tsx, address-form-dialog.tsx,
  theme-provider.tsx, theme-toggle.tsx, bottom-nav.tsx, coming-soon.tsx
hooks/
  use-account.ts       # all state + handlers for the Auth/Profile/Address flow
  account-context.tsx   # React context wrapping useAccount() for use across routes
lib/
  api-client.ts        # see "API calls" below
  types.ts             # User / Address / AddressFormValues
  utils.ts             # shadcn's cn() helper
docs/
  designs/                              # mobile design screenshots, numbered 01-12 + light_mode_all_pages
  PROPOSED_PUBLIC_BROWSE_CONTRACT.md    # drafted, not yet implemented — see above
```

## API calls go through `lib/api-client.ts` — no exceptions

`lib/api-client.ts` is the only file that knows `NEXT_PUBLIC_API_URL`, attaches the `Authorization` header, and retries once on a 401 after refreshing the access token. Every component and hook calls `apiFetch()` from there — never `fetch()` directly. Tokens live in memory only (module-level, not `localStorage`), so a full page reload signs the user out; that's an existing gap carried over from before this refactor, not something to silently fix — flag it instead if it needs to change.

## Scope: what's actually built vs. what the designs show

Backend is far along now (see `../salonjaa-backend/docs/PROGRESS.md`): Auth, User+Address, Salon+Branch, Staff+Services, Availability+Booking, Payment+Coupon, Reviews are all 🟢 Live; Admin is partial. Despite that, four design screens (Home `02`, Nearby Salons `04`, Salon Details `03`, Select Services `05`) have **nothing to call** — every salon/branch/service read is Salon-Owner-scoped, not public. Those stay placeholders (`components/coming-soon.tsx`) until `docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md` is implemented. Choose Stylist (`06`), Choose Slot (`07`), Checkout (`08`), Payment (`09`), Booking Confirmed (`10`), and My Bookings (`12`) all have live endpoints already (`/availability/*`, `/bookings`, `/payments/*`) and don't need that contract — build those next.

The Profile menu's disabled rows (My Wallet, Payment Methods, Refer & Earn, Help & Support, Settings) and the Offers tab stay disabled/placeholder for the same reason: **don't wire disabled or placeholder screens to fake data or invented endpoints.** Build them out only once their backend module ships and `frontend_handover.md` documents the contract.

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

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api/v1` if unset) to point at a running instance of `../salonjaa-backend`.
