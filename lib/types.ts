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
