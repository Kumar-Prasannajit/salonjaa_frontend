# Proposed: Public Salon/Branch Browse Contract

Not implemented anywhere yet. Drafted by the frontend so there's something concrete
to take to the backend side, same pattern as `docs/ADMIN_CONTRACT.md` being written
before Admin was built. Nothing here should be assumed live until PROGRESS.md says so.

## Why this is needed

Every existing salon/branch/service read (`GET /salons`, `GET /salons/:id`,
`GET /branches`, `GET /branches/:id`, `GET /services`, `GET /services/:id`) requires
`Salon Owner` auth and is scoped to salons that user owns. There is no endpoint a
logged-out or logged-in *customer* can call to discover a salon or see its service
menu. `GET /availability/slots` / `GET /availability/staff` are public but both
require already knowing `branchId` + `serviceIds` — they're reachable only *after*
discovery, not a substitute for it. Designs 02 (Home), 04 (Nearby Salons), 03 (Salon
Details), and 05 (Select Services) have nothing to call today.

## Proposed endpoints (all public, no auth)

### `GET /public/branches`
List/search branches for the customer browse screens (Home's "Popular Near You",
Explore/Nearby Salons). A "salon card" in the designs is really a branch — booking
is branch-scoped, so the browsable unit should be too.

Query: `city?`, `area?`, `lat?`, `lng?` (needed together for `distanceKm` + sort-by-distance),
`q?` (free-text search over salon/branch name), `serviceCategoryId?`, `sort?` (`distance|rating|popular`).

```json
[{
  "branchId": "",
  "salonId": "",
  "salonName": "",
  "branchName": "",
  "city": "",
  "area": "",
  "coverImage": null,
  "distanceKm": 0.8,
  "averageRating": 4.8,
  "reviewCount": 512
}]
```

`distanceKm` only present when `lat`/`lng` were supplied — compute via Postgres
`earthdistance`/Haversine against `branches.latitude/longitude`, per the "Location
decision" already recorded in PROGRESS.md (no Google Maps dependency).
`averageRating`/`reviewCount` — live aggregate over `reviews` joined through
`bookings`→`branchId` (or however Review's schema keys back to a branch/salon;
whichever is cheaper given today's schema). Compute live, no cache — same
precedent as Availability skipping Redis for MVP.

### `GET /public/branches/:branchId`
Salon Details screen (03).

```json
{
  "branchId": "", "salonId": "", "salonName": "", "branchName": "",
  "description": "", "coverImage": null, "gallery": [],
  "city": "", "area": "", "addressLine1": "",
  "latitude": 0, "longitude": 0,
  "verificationStatus": "VERIFIED",
  "averageRating": 4.8, "reviewCount": 512,
  "openingTime": "09:00", "closingTime": "21:00",
  "services": [
    { "id": "", "categoryId": "", "categoryName": "", "name": "", "durationMinutes": 45, "basePrice": 499, "imageUrl": null }
  ]
}
```

Only `VERIFIED` (and not `SUSPENDED`) branches/salons should be returned — same
gate Admin already enforces for "public/bookable." 404 for anything else, same as
an owner requesting a branch they don't own gets 404 today (existence not leaked).

### `GET /service-categories`
Public. Backing data already exists (`npm run db:seed`'s 8 starter categories,
Module 4) — there's just no read route yet. Powers the "Top Services" chips (Home)
and the Hair/Skin/Spa/Makeup/Nails filter row (Select Services, 05).

```json
[{ "id": "", "name": "Haircut", "icon": null }]
```

## Explicitly NOT proposed here (dropped from MVP per this session's decision)

- **Per-branch discount/promo badge** ("20% OFF" pills) — no source of truth
  anywhere (only a coupon *code* validate endpoint exists, no browsable list of
  active promotions, no discount field on `branches`/`salons`). Would need a new
  column + an owner-facing way to set it, which is its own scope decision, not a
  read-contract addition. Frontend will ship salon/branch cards without a discount
  badge until this is deliberately taken up.
- **Favorites/wishlist** (heart icon on cards) — already listed as an unresolved
  "Pending Decision" in `context.md`; no endpoint, no table. Frontend will render
  the heart icon as visually present (per design) but inert, or omit it — decide
  when this contract lands.
- **Coupon/offers browsing** (bottom-nav "Offers" tab) — only
  `POST /payments/coupons/validate` (validate-by-code) exists, no list-active-coupons
  endpoint. Same "Coming soon" treatment as the other nav rows already disabled in
  `profile-menu.tsx`.

## Auth model this assumes

Browsing (Home → Explore → Salon Details → Select Services → Choose Stylist →
Choose Slot) stays fully anonymous. The customer is only asked to authenticate
(email OTP) at Checkout, right before the actual `POST /bookings` call — matching
`POST /bookings`'s existing `Authentication: Customer` requirement, nothing new
needed there. If `GET /users/me` comes back with no `name` yet (fresh signup),
collect basic details (`PATCH /users/me`) as one extra step before finishing
checkout, then proceed to payment. This requires no backend contract change —
it's a frontend sequencing decision this session made explicit.
