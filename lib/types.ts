export type User = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  dob: string | null;
  profileImage: string | null;
};

export type Address = {
  id: string;
  label?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
};

export type AddressFormValues = {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

export const blankAddressForm: AddressFormValues = {
  label: "Home",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  isDefault: false,
};

// GET /public/branches response row (Module 10) — Home's "Popular Near You"
// and Explore/Nearby Salons. Bare array, no envelope, per frontend_handover.md.
// No `area` field exists on branches — only addressLine1/city — so that's the
// secondary location line. `distanceKm` is `null` (not omitted) when the
// request didn't send lat+lng (real device geolocation, see
// hooks/use-geolocation.ts — there's no geocoding endpoint to turn it into a
// place name) — checked directly against the backend's own
// public-branch.types.ts, not just the doc's example payload. `averageRating`
// is likewise `null` for a branch with zero reviews, not `0` — don't call
// `.toFixed()` on either without a null check first (components/salon-card.tsx
// is the one place that does).
export type PublicBranchSummary = {
  branchId: string;
  salonId: string;
  salonName: string;
  branchName: string;
  city: string;
  addressLine1: string;
  coverImage: string | null;
  distanceKm: number | null;
  averageRating: number | null;
  reviewCount: number;
  // Module 21 — computed server-side from the branch's average
  // active-service price, no owner input. `null` only if the branch
  // somehow has zero active services.
  priceTier: "₹" | "₹₹" | "₹₹₹" | null;
  // Module 21 — owner-set per branch (defaults `UNISEX`), settable via the
  // existing POST /branches/PATCH /branches/:id body — no new endpoint.
  genderServed: "UNISEX" | "MEN" | "WOMEN";
  // Module 21 — listing-card only, not present on PublicBranchDetail below
  // (which already has the full list via GET /public/promotions?branchId=).
  // Only set when the owner has explicitly flagged one of the branch's
  // active, in-range promotions as `featured` — a branch with active,
  // unfeatured promotions still gets `null` here, never an automatic pick.
  activePromotion: { title: string; bannerImageUrl: string | null } | null;
};

// Module 22 — GET /public/branches/:branchId's per-service variants[] (e.g.
// "Short Hair"/"Long Hair" at different prices). A variant overrides price
// only — duration always comes from the parent service's durationMinutes.
export type ServiceVariant = {
  id: string;
  name: string;
  price: number;
};

// GET/POST /services/:id/variants, PATCH/DELETE .../variants/:variantId
// (Module 22, owner-scoped, frontend_handover.md's "Service variants" section) —
// same envelope/sub-resource pattern as staff assignment. Includes `status`
// (owner CRUD only) and `branchServiceId`, unlike the public/customer-facing
// ServiceVariant above which the backend only ever returns already-ACTIVE.
export type OwnerServiceVariant = {
  id: string;
  branchServiceId: string;
  name: string;
  price: number;
  status: "ACTIVE" | "INACTIVE";
};

// GET /public/promotions?branchId= (Module 16's public counterpart of the owner
// CRUD) — active, in-range promotions for a branch, regardless of `featured`
// (that flag only decides the listing-card banner via activePromotion above).
// Bare fields only — no branchIds/serviceIds/featured/active on the public DTO.
export type PublicPromotion = {
  id: string;
  title: string;
  description: string | null;
  bannerImageUrl: string | null;
  startsAt: string;
  endsAt: string;
};

// GET /public/branches/:branchId embedded service row — no `status` field,
// the backend only ever returns bookable (ACTIVE) services here.
// `variants` is new (Module 22): empty means book directly with basePrice
// (unchanged); non-empty means picking one is required — see
// app/salons/[branchId]/services/page.tsx's variant picker.
export type PublicService = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  imageUrl: string | null;
  variants: ServiceVariant[];
};

// GET /public/branches/:branchId response (Module 10) — Salon Details +
// Select Services. Bare object, no envelope. `gallery` is always `[]` today
// (salon_gallery_images doesn't exist yet, per the backend note) — present
// only so this doesn't need a breaking shape change once that ships.
// `phone` is new (Module 19) — the branch's own phone column, null if the
// owner never set one — closes the "Contact"/"Call Salon" gap. Also gains
// priceTier/genderServed same as the listing row (Module 21), but never
// activePromotion — that field is listing-card only.
export type PublicBranchDetail = Omit<PublicBranchSummary, "activePromotion"> & {
  description: string | null;
  gallery: string[];
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  verificationStatus: string;
  openingTime: string;
  closingTime: string;
  services: PublicService[];
};

// GET /service-categories response row (Module 10) — "Top Services" chips
// (Home). frontend_handover.md claims `icon` is always null, but the live
// seed data actually returns short semantic strings (e.g. "scissors", "spa")
// — app/(tabs)/page.tsx maps these to Lucide icons with a fallback
// for anything unrecognized, so still typed nullable in case that changes.
export type ServiceCategory = {
  id: string;
  name: string;
  icon: string | null;
};

// GET /availability/staff response row — see docs/designs/06-choose-stylist.jpeg.
// No photo/rating/experience fields exist on this contract; don't fabricate them.
export type AvailableStaff = {
  staffId: string;
  name: string;
  type: string;
};

// GET /availability/slots response row — see docs/designs/07-choose-slot.jpeg.
// slotId is a plain "HH:MM-HH:MM" string per the backend, not a persisted ID.
export type AvailableSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  available: boolean;
};

// POST /payments/coupons/validate response — preview only, see the note in
// app/book/[branchId]/checkout/page.tsx about why it isn't deducted from the
// booking total.
export type CouponValidation = {
  valid: boolean;
  discount: number;
};

// POST /bookings response — bare, no envelope, per frontend_handover.md.
export type BookingCreateResult = {
  bookingId: string;
  status: string;
};

// Real shape observed from a live GET /bookings/my-bookings call (frontend_handover.md
// doesn't specify the row contract beyond "not supplied") — no salon/branch/staff
// *name* fields exist here, only their IDs. Those endpoints are all Salon-Owner-scoped
// (see docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md), so a customer's own booking list has
// no way to resolve them to a display name today — see app/(tabs)/bookings/page.tsx's
// note on how that's handled without fabricating anything.
// Module 14b — AWAITING_PAYMENT added: an ONLINE-payment booking now sits
// here (not APPROVED) once the salon approves it and its
// BOOKING_PAYMENT_WINDOW_MINUTES-minute payment window is running; a
// PAY_AT_SALON booking never passes through this state (approve goes
// straight to APPROVED, unchanged). See docs/KNOWN_BACKEND_LIMITATIONS.md.
// Module 16 — NO_SHOW added: POST /salon-bookings/:id/no-show moves an
// APPROVED booking here any time at/after its scheduled start, recording a
// customer strike automatically.
export type BookingStatus = "PENDING" | "AWAITING_PAYMENT" | "APPROVED" | "CANCELLED" | "COMPLETED" | "EXPIRED" | "NO_SHOW";

export type Booking = {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  salonId: string;
  branchId: string;
  bookingType: string;
  bookingStatus: BookingStatus;
  // Module 14b — set at POST /bookings creation time (ONLINE default),
  // snapshotted onto the booking; walk-ins always get PAY_AT_SALON. Module
  // 20 adds WALLET — debits the full total immediately at creation time.
  paymentMethod: "ONLINE" | "PAY_AT_SALON" | "WALLET";
  selectedStaffId: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  totalDurationMinutes: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  // Module 19 — new alongside the existing freeform cancellationReason,
  // null unless the cancelling customer picked one of the fixed reasons
  // (see CancellationReasonCode below).
  cancellationReasonCode: CancellationReasonCode | null;
  approvedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  // Module 16 — set when POST /salon-bookings/:id/no-show fires.
  noShowAt: string | null;
  // Module 16 — a customer with 4+ lifetime NO_SHOWs needs a 10%-of-total
  // advance deposit before the salon can even approve a PAY_AT_SALON
  // booking (an ONLINE booking never sets this — paying the full amount
  // upfront already covers it). advanceAmount is null unless
  // requiresAdvancePayment is true. Pay it via the existing
  // POST /payments/create-order/POST /payments/verify flow, same as any
  // other online payment — see app/bookings/[bookingId]/pay/page.tsx.
  requiresAdvancePayment: boolean;
  advanceAmount: number | null;
  createdAt: string;
  // Module 11 — resolved server-side on GET /bookings/:id, GET /bookings/my-bookings,
  // and GET /salon-bookings only (not on the mutation-confirmation responses, which
  // return null for all 4 here per that module's note). staffName is null when
  // selectedStaffId wasn't set.
  salonName: string | null;
  branchName: string | null;
  city: string | null;
  staffName: string | null;
  // Module 19 — resolved the same way as the Module 11 fields above, same
  // scoping (read endpoints only, null on mutation-confirmation responses).
  // Closes the "Call Salon" gap.
  branchPhone: string | null;
};

// POST /bookings/:id/cancel's optional reasonCode (Module 19) — a fixed
// picker mirroring "why are you cancelling?", "OTHER" reveals a freeform
// `reason` field. Both fields stay optional today per frontend_handover.md
// ("not yet required — see note below"); don't assume either is mandatory.
export type CancellationReasonCode = "NEED_HELP" | "TOOK_TOO_LONG_TO_CONFIRM" | "BOOKED_BY_MISTAKE" | "BOOKED_ELSEWHERE" | "OTHER";

// GET /bookings/:id embeds this — the list endpoint above does not.
// variantId/variantName are new (Module 22) — both null when no variant was
// involved; `price` is already the effective price (the variant's price when
// one was selected, basePrice otherwise).
export type BookingServiceLine = {
  serviceId: string;
  serviceName: string;
  variantId: string | null;
  variantName: string | null;
  durationMinutes: number;
  price: number;
  quantity: number;
  totalAmount: number;
};

export type BookingDetail = Booking & { services: BookingServiceLine[] };

// POST /payments/create-order response. `amount` is in rupees (same unit as
// booking.totalAmount) per the backend's payment.service.ts — Razorpay's
// checkout widget needs paise, so the caller must multiply by 100 itself.
export type PaymentOrder = {
  orderId: string;
  amount: number;
  currency: string;
};

// POST /payments/verify response.
export type PaymentVerifyResult = {
  success: true;
  paymentStatus: string;
};

// GET /payments/my-payments row (payment.service.ts's toPaymentDTO) — used
// only to check whether a booking already has a SUCCESS payment, so
// booking-card.tsx doesn't keep offering "Pay Now" after payment succeeded.
// review.types.ts's ReviewDTO. `review` (text) is optional per the backend's
// zod schema — ratings are the only required fields.
export type Review = {
  id: string;
  bookingId: string;
  customerId: string | null;
  salonId: string;
  branchId: string;
  staffId: string | null;
  overallRating: number;
  review: string | null;
  serviceRating: number | null;
  staffRating: number | null;
  hygieneRating: number | null;
  ambienceRating: number | null;
  productRating: number | null;
  isEdited: boolean;
  createdAt: string;
  reply?: { message: string; createdAt: string } | null;
};

export type ReviewRatings = {
  overallRating: number;
  serviceRating: number;
  staffRating: number;
  hygieneRating: number;
  ambienceRating: number;
  productRating: number;
};

// ---- Salon Owner (app/owner/*) ----
// Field lists checked directly against the backend's own *.types.ts DTOs
// (salon.types.ts/branch.types.ts/staff.types.ts/service.types.ts), not just
// frontend_handover.md's "contract not supplied" examples.

// GET /salons (list) -> bare [{ id, name }] exactly, per frontend_handover.md.
export type SalonListItem = { id: string; name: string };

// GET /salons/:salonId, POST /salons, PATCH /salons/:salonId -> envelope-wrapped SalonDTO.
export type Salon = {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  status: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verificationReason: string | null;
  createdAt: string;
};

export type Branch = {
  id: string;
  salonId: string;
  name: string;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  totalChairs: number;
  openingTime: string;
  closingTime: string;
  status: string;
  // Module 21 — owner-set (defaults UNISEX), settable via the existing
  // POST /branches/PATCH /branches/:id body (frontend_handover.md's new
  // optional `genderServed` field, no new endpoint) — drives the same-name
  // listing-card/detail signal in PublicBranchSummary/Detail above.
  genderServed: "UNISEX" | "MEN" | "WOMEN";
};

export type BranchHoliday = { id: string; date: string; reason: string | null };

export type BranchCapacityRule = { branchId: string; maxCapacityOverride: number | null };

// GET/POST /branches/:id/slot-templates, PATCH/DELETE .../slot-templates/:templateId
// (Module 17) — TRD §4's exact column shape. A branch with zero *active*
// templates keeps the old fixed-30-minute-interval slot generation
// unchanged; adding one or more switches that branch over to per-template
// generation (its own start/end bounds the walk, its own slotDurationMinutes
// is the step). `active` is the only field PATCH-able beyond the create
// fields, per frontend_handover.md's create body — used to pause a template
// without deleting it.
export type SlotTemplate = {
  id: string;
  branchId: string;
  name: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active: boolean;
};

// staffType has exactly two values on the backend (staff.validator.ts's zod enum) —
// frontend_handover.md's own example body only shows "NORMAL", not the full set.
export type Staff = {
  id: string;
  branchId: string;
  fullName: string;
  phone: string | null;
  profileImage: string | null;
  gender: string | null;
  joiningDate: string | null;
  experienceYears: number | null;
  bio: string | null;
  staffType: "NORMAL" | "STAR";
  consultationFee: number | null;
  salary: number | null;
  status: string;
};

export type StaffLeave = {
  id: string;
  staffId: string;
  startDateTime: string;
  endDateTime: string;
  reason: string | null;
  status: string;
};

// GET/POST /salons/:salonId/gallery, DELETE .../gallery/:imageId (Module
// 17) — same "URL string, frontend hosts the file elsewhere" precedent as
// salons.logo/coverImage, no upload endpoint. Backs GET
// /public/branches/:branchId's previously-always-`[]` `gallery` field.
export type SalonGalleryImage = { id: string; imageUrl: string; displayOrder: number | null };

// GET/POST /promotions, PATCH/DELETE /promotions/:id (Module 17, owner) —
// frontend_handover.md only documents the create/update body, not a
// list/get response shape, so `id`/`active`/timestamp fields here are the
// same-convention best guess this codebase makes elsewhere (e.g. admin
// coupons' `active` flag) rather than something observed against a live
// call — flag and correct if the real response differs.
export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  bannerImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  branchIds: string[];
  serviceIds: string[];
  featured: boolean;
  active: boolean;
};

// GET /salons/:salonId/analytics?from&to (Module 17, owner-scoped) — same
// deliberately-minimal, no-charts philosophy as Admin's reports overview.
// averageRating/reviewCount are live (not date-ranged); everything else is
// scoped to the from/to query.
export type SalonAnalytics = {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  totalRevenue: number;
  averageRating: number | null;
  reviewCount: number;
  topServices: { serviceId: string; serviceName: string; bookingCount: number }[];
};

// GET/POST /services — named OwnerService (not Service) to avoid colliding
// with PublicService above, which is a different, customer-facing shape.
export type OwnerService = {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: number;
  imageUrl: string | null;
  status: string;
};

// ---- Admin (app/admin/*) ----

export type AdminSalon = Salon & {
  ownerProfile: {
    id: string;
    userId: string;
    businessName: string | null;
    gstNumber: string | null;
    panNumber: string | null;
    kycStatus: string;
  };
};

export type AdminRefund = {
  id: string;
  amount: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";
  approvedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    scheduledStart: string;
    scheduledEnd: string;
    bookingStatus: string;
    totalAmount: number;
  };
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    providerPaymentId: string | null;
    paidAt: string | null;
  };
  customer: { id: string; email: string; fullName: string | null } | null;
};

export type AdminComplaint = {
  id: string;
  type: "BOOKING" | "PAYMENT" | "SALON" | "STAFF" | "REFUND" | "OTHER";
  referenceId: string | null;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  filedBy: { id: string; email: string; fullName: string | null };
  linkedBooking?: { id: string; bookingNumber: string; bookingStatus: string } | null;
  linkedPayment?: { id: string; amount: number; status: string } | null;
};

export type AdminReportOverview = {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSalons: number;
  verifiedSalons: number;
  pendingSalons: number;
  totalRevenue: number;
  openComplaints: number;
  pendingRefunds: number;
};

export type Payment = {
  id: string;
  bookingId: string;
  customerId: string;
  method: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  paidAt: string | null;
  createdAt: string;
};

// GET /payments/refunds — customer-only, the requester's own refund requests
// (mirrors AdminRefund's status enum, minus the joined booking/payment/
// customer context an admin needs but a customer already has from their own
// booking). Used only to know "have I already requested a refund for this
// booking" (components/booking-card.tsx) — there's no design mockup for a
// dedicated "my refunds" screen, so this doesn't get one either.
export type Refund = {
  id: string;
  bookingId: string;
  paymentId: string;
  customerId: string;
  amount: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";
  processedAt: string | null;
  createdAt: string;
};

// GET /wallet (Module 20) — customer-only, envelope-wrapped ({ data: { balance } },
// same convention as e.g. Salon above) — a caller that treats the response as a bare
// { balance } gets `undefined` and silently renders no number. A customer with no
// wallet activity yet gets { balance: 0 }, not a 404, so `data` is never null once fetched.
export type Wallet = { balance: number };

// GET /wallet/transactions (Module 20) — customer-only, newest first. Only
// ever funded by admin-approved refunds and Module 16 strikes-policy
// advance-forfeitures (both automatic) — there's no top-up/add-funds
// endpoint anywhere, so a CREDIT row is never something the customer did
// themselves.
export type WalletTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter: number;
  reason: "BOOKING_PAYMENT" | "BOOKING_REFUND" | "REFUND_APPROVED" | "ADVANCE_FORFEITURE";
  referenceId: string | null;
  description: string | null;
  createdAt: string;
};
