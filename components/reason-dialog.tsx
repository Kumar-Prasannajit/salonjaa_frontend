"use client";

import { FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Generic "type a reason/notes, confirm" dialog — the same shape frontend_handover.md
// asks for across a dozen owner/admin actions (reject salon, suspend salon, reject
// refund, resolve/reject complaint, reject booking, …), each just varying whether the
// text is required and whether the action reads as destructive. Extracted so those
// screens don't each re-implement components/cancel-booking-dialog.tsx's pattern.
export function ReasonDialog({
  open,
  title,
  description,
  label = "Reason",
  placeholder,
  required = true,
  confirmLabel,
  destructive,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  confirmLabel: string;
  destructive?: boolean;
  busy: boolean;
  error: string;
  onConfirm: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) setText("");
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(text);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason-dialog-text">{label}</Label>
            <textarea
              id="reason-dialog-text"
              required={required}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              className={destructive ? "flex-1" : "flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"}
              disabled={busy}
            >
              {busy ? "Submitting…" : confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
