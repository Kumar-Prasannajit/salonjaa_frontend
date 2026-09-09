"use client";

import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Booking } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "text-primary" },
  AWAITING_PAYMENT: { label: "Awaiting Payment", className: "text-primary" },
  APPROVED: { label: "Approved", className: "text-success" },
  COMPLETED: { label: "Completed", className: "text-success" },
  CANCELLED: { label: "Cancelled", className: "text-destructive" },
  REJECTED: { label: "Rejected", className: "text-destructive" },
  EXPIRED: { label: "Expired", className: "text-muted-foreground" },
  // Module 16 — POST /salon-bookings/:id/no-show's terminal state.
  NO_SHOW: { label: "No-show", className: "text-destructive" },
};

// GET /salon-bookings row — Module 11's resolved salonName/branchName/staffName
// fields (see lib/types.ts's note) mean this can show a real salon/branch/
// stylist line instead of components/booking-card.tsx's UUID workaround.
export function SalonBookingCard({
  booking,
  onApprove,
  onReject,
  onNoShow,
  busy,
}: {
  booking: Booking;
  onApprove: (b: Booking) => void;
  onReject: (b: Booking) => void;
  // Module 16 — POST /salon-bookings/:id/no-show ({} body). Errors: 400 too
  // early (before scheduledStart), 409 if not APPROVED — the client-side
  // gate below (canMarkNoShow) gets both cases right without a round trip.
  onNoShow: (b: Booking) => void;
  busy: boolean;
}) {
  const router = useRouter();
  const status = STATUS_STYLE[booking.bookingStatus] || { label: booking.bookingStatus, className: "text-muted-foreground" };
  // Approve/reject only ever apply to a still-PENDING booking (the backend
  // 409s otherwise) — an AWAITING_PAYMENT one has already been approved and
  // is just waiting on the customer's online payment. Reschedule stays
  // available through that window too: Module 14b keeps AWAITING_PAYMENT
  // capacity-consuming exactly like APPROVED, and proposeReschedule's own
  // isCapacityConsuming check allows it.
  const canDecide = booking.bookingStatus === "PENDING";
  const canReschedule =
    booking.bookingStatus === "PENDING" || booking.bookingStatus === "AWAITING_PAYMENT" || booking.bookingStatus === "APPROVED";
  // Module 16 — a restricted customer's advance must clear before Approve
  // works (409 otherwise); the owner can't see payment status directly
  // (no owner-facing payments list for one customer's booking), so this is
  // informational rather than a hard client-side block on the button.
  const advancePending = booking.bookingStatus === "PENDING" && booking.requiresAdvancePayment;
  const canMarkNoShow = booking.bookingStatus === "APPROVED" && new Date(booking.scheduledStart).getTime() <= Date.now();

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{booking.bookingNumber}</p>
          <p className="text-sm text-muted-foreground">
            {booking.branchName || booking.branchId}
            {booking.staffName ? ` • ${booking.staffName}` : ""}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {formatDateTime(booking.scheduledStart)}
          </p>
        </div>
        <span className={`text-sm font-medium ${status.className}`}>{status.label}</span>
      </div>

      <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
        <span>{booking.customerName || "Registered customer"}</span>
        <span className="font-semibold">₹{booking.totalAmount}</span>
      </div>

      {booking.bookingStatus === "AWAITING_PAYMENT" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {/* BOOKING_PAYMENT_WINDOW_MINUTES's current server default (15) — no endpoint returns this
              number, so this is a best-effort figure, not a live countdown against the real deadline. */}
          Waiting on the customer to pay online — auto-cancels after 15 minutes if unpaid.
        </p>
      )}

      {advancePending && (
        <p className="mt-2 text-xs text-muted-foreground">
          This customer needs a ₹{booking.advanceAmount} advance payment cleared before you can approve — Approve will fail until then.
        </p>
      )}

      {(canDecide || canReschedule || canMarkNoShow) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canDecide && (
            <>
              <Button size="sm" className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" disabled={busy} onClick={() => onApprove(booking)}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" disabled={busy} onClick={() => onReject(booking)}>
                Reject
              </Button>
            </>
          )}
          {canReschedule && (
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => router.push(`/owner/bookings/${booking.id}/propose-reschedule`)}>
              Propose Reschedule
            </Button>
          )}
          {canMarkNoShow && (
            <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" disabled={busy} onClick={() => onNoShow(booking)}>
              Mark No-Show
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
