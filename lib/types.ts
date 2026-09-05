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
export type BookingStatus = "PENDING" | "APPROVED" | "CANCELLED" | "COMPLETED" | "EXPIRED";

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
  createdAt: string;
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
