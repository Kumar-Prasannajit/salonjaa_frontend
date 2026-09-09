"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Module 15 — POST /bookings/:id/approve-reschedule and /reject-reschedule now
// resolve the responder generically: whoever did *not* propose the pending
// reschedule request is the one who must call them, so this one dialog works
// for both directions (a customer responding to a salon-proposed reschedule,
// or a salon owner responding to a customer-proposed one) — used from both
// components/booking-card.tsx and components/owner/salon-booking-card.tsx,
// same "dumb dialog, parent owns the fetch" split as CancelBookingDialog.
//
// Known gap (see docs/KNOWN_BACKEND_LIMITATIONS.md): there's no GET endpoint
// anywhere to fetch a booking's pending reschedule request, so this can't
// show *what* was proposed (new date/time) before the responder decides —
// only that responding is possible. The responder finds those details from
// the email notification sent when the request was created. Calling either
// action with nothing actually pending 404s with a clear message ("No
// pending reschedule request for this booking"), shown as-is via `error`
// rather than papered over.
export function RespondToRescheduleDialog({
  booking,
  busy,
  error,
  onAccept,
  onDecline,
  onClose,
}: {
  booking: Booking | null;
  busy: boolean;
  error: string;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "declining">("choose");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!booking) {
      setMode("choose");
      setReason("");
    }
  }, [booking]);

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to Reschedule Request</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          If the other party has proposed a new date/time for {booking?.bookingNumber}, you can accept or decline it here — check the
          notification you were sent for what&apos;s being proposed, since there&apos;s no way to preview it in-app before deciding.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mode === "choose" ? (
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 text-destructive hover:text-destructive" disabled={busy} onClick={() => setMode("declining")}>
              Decline
            </Button>
            <Button type="button" className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" disabled={busy} onClick={onAccept}>
              {busy ? "Accepting…" : "Accept New Time"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="decline-reschedule-reason">Reason (optional)</Label>
              <textarea
                id="decline-reschedule-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={() => setMode("choose")}>
                Back
              </Button>
              <Button type="button" variant="destructive" className="flex-1" disabled={busy} onClick={() => onDecline(reason.trim())}>
                {busy ? "Declining…" : "Confirm Decline"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
