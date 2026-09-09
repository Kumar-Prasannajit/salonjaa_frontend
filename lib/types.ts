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
};

// GET /public/branches/:branchId embedded service row — no `status` field,
// the backend only ever returns bookable (ACTIVE) services here.
export type PublicService = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  imageUrl: string | null;
};

// GET /public/branches/:branchId response (Module 10) — Salon Details +
// Select Services. Bare object, no envelope. `gallery` is always `[]` today
// (salon_gallery_images doesn't exist yet, per the backend note) — present
// only so this doesn't need a breaking shape change once that ships.
export type PublicBranchDetail = PublicBranchSummary & {
  description: string | null;
  gallery: string[];
  latitude: number | null;
  longitude: number | null;
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
  // snapshotted onto the booking; walk-ins always get PAY_AT_SALON.
  paymentMethod: "ONLINE" | "PAY_AT_SALON";
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
};

// GET /bookings/:id embeds this — the list endpoint above does not.
export type BookingServiceLine = {
  serviceId: string;
  serviceName: string;
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
};

export type BranchHoliday = { id: string; date: string; reason: string | null };

export type BranchCapacityRule = { branchId: string; maxCapacityOverride: number | null };

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
