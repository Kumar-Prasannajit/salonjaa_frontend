"use client";

import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Booking } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "text-primary" },
  APPROVED: { label: "Approved", className: "text-success" },
  COMPLETED: { label: "Completed", className: "text-success" },
  CANCELLED: { label: "Cancelled", className: "text-destructive" },
  REJECTED: { label: "Rejected", className: "text-destructive" },
  EXPIRED: { label: "Expired", className: "text-muted-foreground" },
};

// GET /salon-bookings row — Module 11's resolved salonName/branchName/staffName
// fields (see lib/types.ts's note) mean this can show a real salon/branch/
// stylist line instead of components/booking-card.tsx's UUID workaround.
export function SalonBookingCard({
  booking,
  onApprove,
  onReject,
  busy,
}: {
  booking: Booking;
  onApprove: (b: Booking) => void;
  onReject: (b: Booking) => void;
  busy: boolean;
}) {
  const router = useRouter();
  const status = STATUS_STYLE[booking.bookingStatus] || { label: booking.bookingStatus, className: "text-muted-foreground" };
  const canDecide = booking.bookingStatus === "PENDING";
  const canReschedule = booking.bookingStatus === "PENDING" || booking.bookingStatus === "APPROVED";

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

      {(canDecide || canReschedule) && (
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
        </div>
      )}
    </Card>
  );
}
