"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { BranchHoliday } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// POST/DELETE /branches/:id/holidays. No GET /branches/:id/holidays exists
// anywhere in frontend_handover.md, so this component keeps its own list —
// seeded from what it creates/deletes itself. This session's own additions
// stay accurate; a holiday created by another session/device won't appear
// until this repo gets a listing endpoint to fetch it from.
export function BranchHolidaysCard({ branchId }: { branchId: string }) {
  const toast = useToastContext();
  const [holidays, setHolidays] = useState<BranchHoliday[]>([]);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setHolidays([]);
  }, [branchId]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body: Record<string, string> = { date };
      if (reason.trim()) body.reason = reason.trim();
      const result = await apiFetch<{ data: BranchHoliday }>(`/branches/${branchId}/holidays`, { method: "POST", body: JSON.stringify(body) });
      setHolidays((h) => [...h, result.data].sort((a, b) => a.date.localeCompare(b.date)));
      setDate("");
      setReason("");
      toast.success("Holiday added.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (holidayId: string) => {
    setRemovingId(holidayId);
    setError("");
    try {
      await apiFetch(`/branches/${branchId}/holidays/${holidayId}`, { method: "DELETE" });
      setHolidays((h) => h.filter((x) => x.id !== holidayId));
      toast.success("Holiday removed.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-semibold">Holidays</h2>
      <p className="text-xs text-muted-foreground">Only holidays added this session are listed — there&apos;s no endpoint to fetch existing ones.</p>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-3 space-y-2">
        {holidays.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarOff className="size-4" />
            No holidays added yet.
          </p>
        )}
        {holidays.map((h) => (
          <div key={h.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span>
              {h.date}
              {h.reason ? ` — ${h.reason}` : ""}
            </span>
            <button type="button" onClick={() => remove(h.id)} disabled={removingId === h.id} aria-label="Remove holiday" className="text-muted-foreground hover:text-destructive">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="holiday-date">Date</Label>
          <Input id="holiday-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="holiday-reason">Reason</Label>
          <Input id="holiday-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Christmas" />
        </div>
        <Button type="submit" size="sm" disabled={busy} className="gap-1.5 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
          <Plus className="size-4" />
          {busy ? "Adding…" : "Add"}
        </Button>
      </form>
    </Card>
  );
}
