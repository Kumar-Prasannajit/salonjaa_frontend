"use client";

import { FormEvent, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Booking } from "@/lib/types";

// POST /bookings/:id/cancel — confirmation dialog + reason, per
// frontend_handover.md's "confirmation dialog, mutation lock" guidance.
// Module 16 finalized the cancellation policy (no longer provisional): free
// up to 2 hours before scheduledStart, blocked entirely inside that window
// (409, no exceptions/strikes for a late attempt) — the Cancel button
// itself is disabled client-side before this dialog can even open, see
// components/booking-card.tsx's isPastCancellationCutoff.
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
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(reason);
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
            <Label htmlFor="cancel-reason">Reason</Label>
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
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Keep booking
            </Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={busy}>
              {busy ? "Cancelling…" : "Cancel booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
