"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Phone } from "lucide-react";
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
// Module 19 — labels for the fixed cancellation reasonCode picker
// (components/cancel-booking-dialog.tsx), used as a fallback display below
// when the customer picked a reason but didn't also type freeform text.
const CANCELLATION_REASON_LABEL: Record<string, string> = {
  NEED_HELP: "Needed help / had a question",
  TOOK_TOO_LONG_TO_CONFIRM: "Took too long to confirm",
  BOOKED_BY_MISTAKE: "Booked by mistake",
  BOOKED_ELSEWHERE: "Booked elsewhere",
  OTHER: "Other",
};

const STATUS_STYLE: Record<Booking["bookingStatus"], { label: string; className: string }> = {
  PENDING: { label: "Pending Approval", className: "text-primary" },
  AWAITING_PAYMENT: { label: "Payment Due", className: "text-primary" },
  APPROVED: { label: "Confirmed", className: "text-success" },
  COMPLETED: { label: "Completed", className: "text-success" },
  CANCELLED: { label: "Cancelled", className: "text-destructive" },
  EXPIRED: { label: "Expired", className: "text-muted-foreground" },
  // Module 16 — POST /salon-bookings/:id/no-show's terminal state.
  NO_SHOW: { label: "No-show", className: "text-destructive" },
};

// Module 16 — finalized policy (no longer provisional/no-cutoff): free up
// to 2 hours before scheduledStart, blocked entirely inside that window
// (409, no exceptions). Computed client-side purely to disable the button
// and explain why upfront — the backend's own cutoff is what actually
// enforces this; see components/cancel-booking-dialog.tsx.
const CANCELLATION_CUTOFF_HOURS = 2;
function isPastCancellationCutoff(scheduledStart: string) {
  const hoursUntilStart = (new Date(scheduledStart).getTime() - Date.now()) / 3_600_000;
  return hoursUntilStart < CANCELLATION_CUTOFF_HOURS;
}

export function BookingCard({
  booking,
  detail,
  paid,
  onCancel,
  cancelling,
  onRespondToReschedule,
}: {
  booking: Booking;
  detail?: BookingDetail;
  // Module 14b: AWAITING_PAYMENT → APPROVED now happens on successful
  // payment, so bookingStatus alone is enough to drive the Pay Now button.
  // This separate GET /payments/my-payments cross-check (see
  // app/(tabs)/bookings/page.tsx's loadBookings()) is kept only for the
  // "Paid" badge on an already-APPROVED ONLINE booking — a PAY_AT_SALON
  // booking reaches APPROVED too, but never has a payment row, so `paid`
  // correctly stays false for it and no badge shows.
  // Module 20: a WALLET booking debits at creation time, tracked in
  // GET /wallet/transactions rather than GET /payments/my-payments, so
  // `paid` (the Razorpay-based cross-check above) never covers it — checked
  // directly off booking.paymentMethod instead, below.
  paid: boolean;
  onCancel: (booking: Booking) => void;
  cancelling: boolean;
  // Module 15 — opens components/respond-to-reschedule-dialog.tsx. Shown
  // unconditionally for any upcoming booking rather than only when one is
  // known to be pending, since there's no endpoint to discover that first —
  // see that dialog's own note.
  onRespondToReschedule: (booking: Booking) => void;
}) {
  const router = useRouter();
  const status = STATUS_STYLE[booking.bookingStatus];
  const isUpcoming =
    booking.bookingStatus === "PENDING" || booking.bookingStatus === "AWAITING_PAYMENT" || booking.bookingStatus === "APPROVED";
  // Module 16 — a restricted customer's PAY_AT_SALON booking needs this
  // settled before the salon can even review it, independent of the normal
  // AWAITING_PAYMENT flow above (which this booking's paymentMethod never
  // enters). `paid` doubles as "advance already paid" here too — the same
  // GET /payments/my-payments cross-check catches any successful payment
  // for this booking, advance or full.
  const advanceDue = booking.bookingStatus === "PENDING" && booking.requiresAdvancePayment && !paid;
  // `paid` is a same-value cross-check for both "fully paid" and "advance
  // paid" (its own comment above), so once the booking reaches APPROVED it
  // can't tell those two apart on its own — a PAY_AT_SALON booking whose
  // advance cleared is `paid === true` too, but the remaining
  // (totalAmount - advanceAmount) is still owed at the salon. Only an
  // ONLINE (or WALLET) booking's `paid` actually means "nothing left to
  // pay"; a PAY_AT_SALON+advance one needs its own label so it doesn't
  // read as fully settled.
  const advancePaidOnly = booking.paymentMethod === "PAY_AT_SALON" && booking.requiresAdvancePayment && paid;
  const pastCutoff = isPastCancellationCutoff(booking.scheduledStart);

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
        <div className="flex flex-col items-end gap-1">
          <span className={`text-sm font-medium ${status.className}`}>{status.label}</span>
          {/* Module 19 — resolved server-side the same way as salonName/branchName/
              staffName (lib/types.ts's note); null if the owner never set a branch phone. */}
          {booking.branchPhone && (
            <a href={`tel:${booking.branchPhone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              <Phone className="size-3" />
              Call Salon
            </a>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
        {detail ? (
          detail.services.map((s) => (
            <div key={s.serviceId} className="flex justify-between">
              <span>
                {s.serviceName}
                {s.variantName && <span className="text-muted-foreground"> — {s.variantName}</span>}
              </span>
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

      {(booking.cancellationReason || booking.cancellationReasonCode || booking.rejectionReason) && (
        <p className="mt-2 text-xs text-muted-foreground">
          Reason:{" "}
          {booking.cancellationReason ||
            (booking.cancellationReasonCode && CANCELLATION_REASON_LABEL[booking.cancellationReasonCode]) ||
            booking.rejectionReason}
        </p>
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

      {booking.bookingStatus === "AWAITING_PAYMENT" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {/* BOOKING_PAYMENT_WINDOW_MINUTES's current server default (15) — no endpoint returns this
              number, so this is a best-effort figure, not a live countdown against the real deadline. */}
          Pay within 15 minutes or this booking will be automatically cancelled.
        </p>
      )}

      {advanceDue && (
        <p className="mt-2 text-xs text-muted-foreground">
          A ₹{booking.advanceAmount} advance is required before the salon can review this booking.
        </p>
      )}

      {isUpcoming && (
        <div className="mt-4 flex gap-2">
          {booking.bookingStatus === "AWAITING_PAYMENT" && (
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
              onClick={() => router.push(`/bookings/${booking.id}/pay`)}
            >
              Pay Now
            </Button>
          )}
          {advanceDue && (
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
              onClick={() => router.push(`/bookings/${booking.id}/pay`)}
            >
              Pay ₹{booking.advanceAmount} Advance
            </Button>
          )}
          {booking.bookingStatus === "APPROVED" && advancePaidOnly && (
            <span className="flex flex-1 items-center justify-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" />
              Advance Paid — ₹{(booking.totalAmount - (booking.advanceAmount ?? 0)).toFixed(2)} due at salon
            </span>
          )}
          {booking.bookingStatus === "APPROVED" && !advancePaidOnly && (paid || booking.paymentMethod === "WALLET") && (
            <span className="flex flex-1 items-center justify-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" />
              {booking.paymentMethod === "WALLET" ? "Paid via Wallet" : "Paid"}
            </span>
          )}
          {booking.bookingStatus === "PENDING" && booking.requiresAdvancePayment && paid && (
            <span className="flex flex-1 items-center justify-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" />
              Advance Paid
            </span>
          )}
          <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/bookings/${booking.id}/reschedule`)}>
            Reschedule
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-destructive hover:text-destructive"
            disabled={cancelling || pastCutoff}
            title={pastCutoff ? `Cancellation is only allowed until ${CANCELLATION_CUTOFF_HOURS} hours before the scheduled time` : undefined}
            onClick={() => onCancel(booking)}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </Button>
        </div>
      )}

      {isUpcoming && pastCutoff && (
        <p className="mt-2 text-xs text-muted-foreground">
          Too close to the appointment time to cancel — free cancellation closes {CANCELLATION_CUTOFF_HOURS} hours before your slot.
        </p>
      )}

      {isUpcoming && (
        <button
          type="button"
          onClick={() => onRespondToReschedule(booking)}
          className="mt-2 w-full text-center text-xs text-muted-foreground underline underline-offset-2"
        >
          Respond to a reschedule request
        </button>
      )}
    </Card>
  );
}
