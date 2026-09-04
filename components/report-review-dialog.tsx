"use client";

import { FormEvent, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// POST /reviews/:reviewId/report — reason is optional per review.validator.ts
// ("not marked required in frontend_handover.md"), unlike cancel/reject
// reasons elsewhere in this app.
export function ReportReviewDialog({
  open,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="report-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you reporting this review?"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={busy}>
              {busy ? "Reporting…" : "Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
