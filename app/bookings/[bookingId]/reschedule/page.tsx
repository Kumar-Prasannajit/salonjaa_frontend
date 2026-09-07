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

// POST /bookings/:id/reschedule-request — customer proposes a new time; the
// original appointment stays in force until the salon approves it
// (frontend_handover.md: "retain original appointment until accepted"), so
// this ends on a plain confirmation, not a changed booking. No requestId in
// the route — approve/reject always resolve the booking's *latest* pending
// request, so submitting a second one here would simply replace the first.
export default function RescheduleBookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetch<{ booking: BookingDetail }>(`/bookings/${bookingId}`)
      .then((result) => setBooking(result.booking))
      .catch((e) => setLoadError(messageFromError(e)));
  }, [bookingId]);

  const submit = async (date: Date, slot: AvailableSlot) => {
    if (!reason.trim()) {
      setReasonError("Let the salon know why you're rescheduling.");
      return;
    }
    setReasonError("");
    setSubmitError("");
    setBusy(true);
    try {
      await apiFetch(`/bookings/${bookingId}/reschedule-request`, {
        method: "POST",
        body: JSON.stringify({ bookingDate: toISODate(date), slotId: slot.slotId, reason }),
      });
      setDone(true);
      toast.success("Reschedule requested.");
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
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center bg-background px-5 py-8 text-center md:max-w-2xl">
        <CheckCircle2 className="size-12 text-success" />
        <h1 className="mt-4 text-xl font-semibold">Reschedule requested</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Your original appointment is still confirmed until the salon accepts this request.
        </p>
        <Button className="mt-6 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/bookings")}>
          Back to My Bookings
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Request Reschedule</h1>
        <div className="size-8" />
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
              </p>
            ))}
          </Card>

          <div className="space-y-2">
            <Label htmlFor="reschedule-reason">Reason</Label>
            <textarea
              id="reschedule-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Not available at the original time"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {reasonError && <p className="text-sm text-destructive">{reasonError}</p>}
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <SlotPicker
            branchId={booking.branchId}
            serviceIds={booking.services.map((s) => s.serviceId)}
            continueLabel={busy ? "Sending request…" : "Request Reschedule"}
            onContinue={submit}
          />
        </div>
      )}
    </main>
  );
}
