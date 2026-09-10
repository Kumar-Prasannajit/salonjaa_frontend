"use client";

import { FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Booking, CancellationReasonCode } from "@/lib/types";

const REASON_OPTIONS: { code: CancellationReasonCode; label: string }[] = [
  { code: "NEED_HELP", label: "I need help / have a question" },
  { code: "TOOK_TOO_LONG_TO_CONFIRM", label: "Took too long to confirm" },
  { code: "BOOKED_BY_MISTAKE", label: "Booked by mistake" },
  { code: "BOOKED_ELSEWHERE", label: "Booked elsewhere" },
  { code: "OTHER", label: "Other" },
];

// POST /bookings/:id/cancel — confirmation dialog + a fixed reason picker
// (Module 19's new `reasonCode`, per frontend_handover.md's "mirror a 'why
// are you cancelling?' list, 'Other' reveals a freeform reason field").
// Both `reasonCode` and freeform `reason` are still optional on the backend
// today (not yet required — that's flagged as tomorrow's follow-up once
// this picker shipped), but requiring a pick here anyway keeps the data
// clean going forward. Module 16 finalized the cancellation policy (no
// longer provisional): free up to 2 hours before scheduledStart, blocked
// entirely inside that window (409, no exceptions/strikes for a late
// attempt) — the Cancel button itself is disabled client-side before this
// dialog can even open, see components/booking-card.tsx's
// isPastCancellationCutoff.
export function CancelBookingDialog({
  booking,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  booking: Booking | null;
  busy: boolean;
  error: string;
  onConfirm: (reasonCode: CancellationReasonCode, reason: string) => void;
  onClose: () => void;
}) {
  const [reasonCode, setReasonCode] = useState<CancellationReasonCode | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!booking) {
      setReasonCode(null);
      setReason("");
    }
  }, [booking]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reasonCode) return;
    onConfirm(reasonCode, reason.trim());
  };

  return (
    <Dialog open={!!booking} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {booking?.bookingNumber} — {booking ? new Date(booking.scheduledStart).toLocaleString() : ""}. This can&apos;t be undone.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Why are you cancelling?</Label>
            <div className="flex flex-wrap gap-2">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setReasonCode(opt.code)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    reasonCode === opt.code ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {reasonCode === "OTHER" && (
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Tell us more</Label>
              <textarea
                id="cancel-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Change of plans"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Keep booking
            </Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={busy || !reasonCode}>
              {busy ? "Cancelling…" : "Cancel booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
