"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { useToastContext } from "@/hooks/toast-context";
import type { AdminStrike, CustomerStrikeSummary } from "@/lib/types";
import { ReasonDialog } from "@/components/reason-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TYPE_LABEL: Record<AdminStrike["type"], string> = {
  FAKE_BOOKING: "Fake booking",
  NO_SHOW: "No-show",
  ABUSIVE_CANCELLATION: "Abusive cancellation",
};

// GET/POST /admin/customers/:customerId/strikes, POST .../:strikeId/remove
// (BUG-013 fix — see app/admin/layout.tsx's note). There's no admin
// "list/search customers" endpoint anywhere in the documented contract
// (frontend_handover.md), so this can only look a customer up by an ID
// already known from elsewhere (a complaint, refund, or booking detail) —
// a search-by-name/email picker isn't invented here since no backend
// support exists for it.
export default function AdminStrikesPage() {
  const toast = useToastContext();
  const [customerId, setCustomerId] = useState("");
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  const [summary, setSummary] = useState<CustomerStrikeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<{ type: AdminStrike["type"]; bookingId: string; notes: string }>({
    type: "NO_SHOW",
    bookingId: "",
    notes: "",
  });
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

  const [removeTarget, setRemoveTarget] = useState<AdminStrike | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const load = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<{ data: CustomerStrikeSummary }>(`/admin/customers/${id}/strikes`);
      setSummary(result.data);
      setLookedUp(id);
    } catch (e) {
      setError(messageFromError(e));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    if (!customerId.trim()) return;
    load(customerId.trim());
  };

  const openAdd = () => {
    setAddForm({ type: "NO_SHOW", bookingId: "", notes: "" });
    setAddError("");
    setAddOpen(true);
  };

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!lookedUp) return;
    setAddError("");
    setAddBusy(true);
    try {
      const body: Record<string, unknown> = { type: addForm.type };
      if (addForm.bookingId.trim()) body.bookingId = addForm.bookingId.trim();
      if (addForm.notes.trim()) body.notes = addForm.notes.trim();
      await apiFetch(`/admin/customers/${lookedUp}/strikes`, { method: "POST", body: JSON.stringify(body) });
      setAddOpen(false);
      await load(lookedUp);
      toast.success("Strike added.");
    } catch (e) {
      const msg = messageFromError(e);
      setAddError(msg);
      toast.error(msg);
    } finally {
      setAddBusy(false);
    }
  };

  const submitRemove = async (reason: string) => {
    if (!lookedUp || !removeTarget) return;
    setRemoveError("");
    setRemoveBusy(true);
    try {
      await apiFetch(`/admin/customers/${lookedUp}/strikes/${removeTarget.id}/remove`, { method: "POST", body: JSON.stringify({ reason }) });
      setRemoveTarget(null);
      await load(lookedUp);
      toast.success("Strike removed.");
    } catch (e) {
      const msg = messageFromError(e);
      setRemoveError(msg);
      toast.error(msg);
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <main>
      <h1 className="font-serif text-lg font-semibold md:text-2xl">Customer Strikes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Look up a customer by ID (from a complaint, refund, or booking detail) to view and manage their strike history.
      </p>

      <form onSubmit={lookup} className="mt-4 flex max-w-xl gap-2">
        <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Customer ID (UUID)" className="flex-1" />
        <Button type="submit" disabled={loading || !customerId.trim()} className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
          <Search className="size-4" />
          Look up
        </Button>
      </form>

      <div className="mt-6 max-w-xl space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && <Skeleton className="h-32 w-full rounded-xl" />}

        {!loading && summary && (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Active no-shows</p>
                  <p className="text-2xl font-semibold">{summary.activeNoShowCount}</p>
                </div>
                <Badge variant={summary.advancePaymentRequired ? "destructive" : "outline"}>
                  {summary.advancePaymentRequired ? "Advance payment required" : "No restriction"}
                </Badge>
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <p className="font-semibold">Strike history</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openAdd}>
                <Plus className="size-4" />
                Add strike
              </Button>
            </div>

            {summary.strikes.length === 0 && (
              <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
                <AlertTriangle className="size-8 text-accent" />
                <p className="font-semibold">No strikes on file</p>
              </Card>
            )}

            {summary.strikes.map((s) => (
              <Card key={s.id} className="gap-1 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{TYPE_LABEL[s.type]}</p>
                  <Badge variant={s.removedAt ? "outline" : "destructive"}>{s.removedAt ? "Removed" : "Active"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{formatDateTime(s.createdAt)}</p>
                {s.notes && <p className="text-sm">{s.notes}</p>}
                {s.removedAt && <p className="text-xs text-muted-foreground">Removed {formatDateTime(s.removedAt)}: {s.removalReason}</p>}
                {!s.removedAt && (
                  <div className="mt-2">
                    <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRemoveTarget(s)}>
                      Remove
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add strike</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitAdd} className="space-y-4">
            {addError && (
              <Alert variant="destructive">
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="strike-type">Type</Label>
              <select
                id="strike-type"
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value as AdminStrike["type"] })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="NO_SHOW">No-show</option>
                <option value="FAKE_BOOKING">Fake booking</option>
                <option value="ABUSIVE_CANCELLATION">Abusive cancellation</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="strike-booking">Booking ID (optional)</Label>
              <Input id="strike-booking" value={addForm.bookingId} onChange={(e) => setAddForm({ ...addForm, bookingId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strike-notes">Notes (optional)</Label>
              <textarea
                id="strike-notes"
                rows={3}
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <Button type="submit" disabled={addBusy} className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
              {addBusy ? "Adding…" : "Add strike"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={!!removeTarget}
        title="Remove this strike?"
        description="Marks the strike removed (metadata only, never deleted) — this is the only way to lift the advance-payment requirement early."
        label="Reason"
        confirmLabel="Remove"
        destructive
        busy={removeBusy}
        error={removeError}
        onConfirm={submitRemove}
        onClose={() => {
          setRemoveTarget(null);
          setRemoveError("");
        }}
      />
    </main>
  );
}
