"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Booking, BookingDetail } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// docs/designs/12-user-bookings.jpeg. Module 11 (see lib/types.ts's note)
// resolves salonName/branchName/staffName server-side on GET
// /bookings/my-bookings, so the card leads with the salon name now instead
// of the booking's raw bookingNumber — bookingNumber (still real data, never
// fabricated) drops to a subtitle for reference, and falls back to being the
// title only in the unlikely case salonName comes back null.
const STATUS_STYLE: Record<Booking["bookingStatus"], { label: string; className: string }> = {
  PENDING: { label: "Pending Approval", className: "text-primary" },
  APPROVED: { label: "Confirmed", className: "text-success" },
  COMPLETED: { label: "Completed", className: "text-success" },
  CANCELLED: { label: "Cancelled", className: "text-destructive" },
  EXPIRED: { label: "Expired", className: "text-muted-foreground" },
};

export function BookingCard({
  booking,
  detail,
  paid,
  onCancel,
  cancelling,
}: {
  booking: Booking;
  detail?: BookingDetail;
  // bookingStatus never changes on a successful payment (no AWAITING_PAYMENT
  // state exists), so this comes from a separate GET /payments/my-payments
  // lookup — see app/(tabs)/bookings/page.tsx's loadBookings().
  paid: boolean;
  onCancel: (booking: Booking) => void;
  cancelling: boolean;
}) {
  const router = useRouter();
  const status = STATUS_STYLE[booking.bookingStatus];
  const isUpcoming = booking.bookingStatus === "PENDING" || booking.bookingStatus === "APPROVED";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{booking.salonName || booking.bookingNumber}</p>
          {booking.salonName && <p className="text-xs text-muted-foreground">{booking.bookingNumber}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {formatDateTime(booking.scheduledStart)}
            {booking.staffName ? ` • ${booking.staffName}` : ""}
          </p>
        </div>
        <span className={`text-sm font-medium ${status.className}`}>{status.label}</span>
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
        {detail ? (
          detail.services.map((s) => (
            <div key={s.serviceId} className="flex justify-between">
              <span>{s.serviceName}</span>
              <span className="text-muted-foreground">₹{s.price}</span>
            </div>
          ))
        ) : (
          <>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </>
        )}
        <div className="flex justify-between pt-1 font-semibold">
          <span>Total</span>
          <span>₹{booking.totalAmount}</span>
        </div>
      </div>

      {(booking.cancellationReason || booking.rejectionReason) && (
        <p className="mt-2 text-xs text-muted-foreground">Reason: {booking.cancellationReason || booking.rejectionReason}</p>
      )}

      {booking.bookingStatus === "COMPLETED" && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => router.push(`/bookings/${booking.id}/review`)}>
            Leave a Review
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/reviews/salon/${booking.salonId}`)}>
            Salon Reviews
          </Button>
        </div>
      )}

      {isUpcoming && (
        <div className="mt-4 flex gap-2">
          {booking.bookingStatus === "APPROVED" &&
            (paid ? (
              <span className="flex flex-1 items-center justify-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" />
                Paid
              </span>
            ) : (
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
                onClick={() => router.push(`/bookings/${booking.id}/pay`)}
              >
                Pay Now
              </Button>
            ))}
          <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/bookings/${booking.id}/reschedule`)}>
            Reschedule
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:text-destructive" disabled={cancelling} onClick={() => onCancel(booking)}>
            {cancelling ? "Cancelling…" : "Cancel"}
          </Button>
        </div>
      )}
    </Card>
  );
}
