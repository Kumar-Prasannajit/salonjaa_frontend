"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { toISODate } from "@/lib/utils";
import type { AvailableSlot, BookingDetail } from "@/lib/types";
import { useToastContext } from "@/hooks/toast-context";
import { SlotPicker } from "@/components/slot-picker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// POST /salon-bookings/:id/propose-reschedule — the salon-initiated
// counterpart to the customer's app/bookings/[bookingId]/reschedule/page.tsx,
// reusing the exact same SlotPicker + GET /availability/slots. The customer
// accept/reject flow (BUG-009 fix) is live — components/booking-card.tsx's
// RespondToRescheduleDialog handles it — this screen only creates the
// request, which then sits PENDING until the customer responds.
export default function ProposeRescheduleBookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetch<{ booking: BookingDetail }>(`/bookings/${bookingId}`)
      .then((result) => setBooking(result.booking))
      .catch((e) => setLoadError(messageFromError(e)));
  }, [bookingId]);

  const submit = async (date: Date, slot: AvailableSlot) => {
    setSubmitError("");
    setBusy(true);
    try {
      await apiFetch(`/salon-bookings/${bookingId}/propose-reschedule`, {
        method: "POST",
        body: JSON.stringify({ bookingDate: toISODate(date), slotId: slot.slotId, reason: reason.trim() || undefined }),
      });
      setDone(true);
      toast.success("Reschedule proposed.");
    } catch (e) {
      const msg = messageFromError(e);
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-[70svh] flex-col items-center justify-center text-center">
        <CheckCircle2 className="size-12 text-success" />
        <h1 className="mt-4 text-xl font-semibold">Reschedule proposed</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">The customer&apos;s original appointment stays confirmed until they respond — they&apos;ll see the new time in their bookings and can accept or decline it there.</p>
        <Button className="mt-6 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/owner/bookings")}>
          Back to Bookings
        </Button>
      </main>
    );
  }

  return (
    <main>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="font-serif text-lg font-semibold md:text-2xl">Propose Reschedule</h1>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !booking && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {booking && (
        <div className="mt-6 space-y-4">
          <Card className="p-4 text-sm">
            <p className="font-semibold">{booking.bookingNumber}</p>
            {booking.services.map((s) => (
              <p key={s.serviceId} className="text-muted-foreground">
                {s.serviceName}
                {s.variantName ? ` — ${s.variantName}` : ""}
              </p>
            ))}
          </Card>

          <div className="space-y-2">
            <Label htmlFor="propose-reason">Reason</Label>
            <textarea
              id="propose-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional — let the customer know why"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <SlotPicker
            branchId={booking.branchId}
            serviceIds={booking.services.map((s) => s.serviceId)}
            continueLabel={busy ? "Sending proposal…" : "Propose Reschedule"}
            onContinue={submit}
          />
        </div>
      )}
    </main>
  );
}
