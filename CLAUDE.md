# Salonjaa Frontend

Customer-facing web app for the Salonjaa salon discovery/booking platform. Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v4 + shadcn/ui (Radix primitives), email-OTP auth against the backend.

## Read these before writing any code

1. **`../salonjaa-backend/docs/frontend_handover.md`** — the API contract source of truth: routes, request bodies, response shapes, auth requirements. Build only what's documented here, same rule the backend follows in reverse.
2. **`../salonjaa-backend/docs/PROGRESS.md`** — what the backend actually has built and tested right now. If a screen needs an endpoint that isn't in `PROGRESS.md`'s "Done and tested" section, it can't be wired up yet — see "Scope" below.
3. **`docs/designs/`** — the mobile design screenshots (`01-auth-screen.jpeg` … `12-user-bookings.jpeg`). Reference these before building or restyling any screen.

## Tech stack decisions

- **Tailwind v4 + shadcn/ui, Radix base.** Theme lives entirely in `app/globals.css` as CSS variables under `:root` / `@theme inline` — there is no `tailwind.config.ts` (v4 doesn't need one) and no `.dark` variant, because unlike a typical shadcn setup there's only one theme: all 12 real designs use a single dark charcoal + gold system, no light mode anywhere. Don't add a light theme or a dark-mode toggle without a design that calls for one.
- **Fonts via `next/font/google`** (`app/layout.tsx`): DM Sans (`--font-sans`) and DM Mono (`--font-mono`), self-hosted rather than the external `@import url(fonts.googleapis.com...)` the app originally used. Playfair Display was dropped — the designs use a plain UI sans everywhere; the "SALONJAA" wordmark is a logo graphic, not live text in a display serif.
- **No router.** The app is currently a single route (`/`). Screens that the design shows as separate destinations (e.g. "Saved Addresses" from the Profile menu) are local view-swaps inside one component tree, not new pages — see `components/account-dashboard.tsx`. Don't reach for `next/navigation` routes until there's an actual second top-level screen worth a URL.

## Folder structure

```text
app/
  layout.tsx, page.tsx, globals.css   # page.tsx is a thin composition root
components/
  ui/                # shadcn-generated primitives — don't hand-edit, re-run `npx shadcn add` instead
  auth-screen.tsx, profile-menu.tsx, address-list.tsx,
  address-form-dialog.tsx, account-dashboard.tsx
hooks/
  use-account.ts      # all state + handlers for the Auth/Profile/Address flow
lib/
  api-client.ts        # see "API calls" below
  types.ts             # User / Address / AddressFormValues
  utils.ts             # shadcn's cn() helper
docs/
  designs/             # mobile design screenshots, numbered 01-12
```

## API calls go through `lib/api-client.ts` — no exceptions

`lib/api-client.ts` is the only file that knows `NEXT_PUBLIC_API_URL`, attaches the `Authorization` header, and retries once on a 401 after refreshing the access token. Every component and hook calls `apiFetch()` from there — never `fetch()` directly. Tokens live in memory only (module-level, not `localStorage`), so a full page reload signs the user out; that's an existing gap carried over from before this refactor, not something to silently fix — flag it instead if it needs to change.

## Scope: what's actually built vs. what the designs show

Only 3 of the 12 design screens have a backend contract to build against right now: the auth splash+form (`01`), the profile menu (`11`), and Saved Addresses (extrapolated — no design screen exists for it, see the comment at the top of `address-list.tsx`). The other 9 (`02`–`10`, `12`) depend on Salon browse, Service, Staff, Availability, Booking, and Payment/Coupon modules that don't exist yet per `PROGRESS.md`. Their corresponding nav rows in the Profile menu (My Bookings, My Wallet, Payment Methods, Refer & Earn, Help & Support, Settings) render disabled with a "Coming soon" label — **don't wire them to fake data or invented endpoints.** Build them out only once their backend module ships and `frontend_handover.md` documents the contract.

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
