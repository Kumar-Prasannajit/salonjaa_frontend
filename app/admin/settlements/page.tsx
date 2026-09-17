"use client";

import { FormEvent, useEffect, useState } from "react";
import { Banknote, Plus } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { useToastContext } from "@/hooks/toast-context";
import type { AdminSalon, AdminSettlement } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
] as const;

const VARIANT: Record<AdminSettlement["status"], "default" | "outline"> = {
  PENDING: "outline",
  PROCESSING: "outline",
  COMPLETED: "default",
};

const BLANK_FORM = { salonId: "", periodStart: "", periodEnd: "", grossAmount: "", commissionAmount: "", refundAmount: "", adjustmentAmount: "" };

// GET/POST /admin/settlements, POST /admin/settlements/:id/mark-settled
// (BUG-013 fix — see app/admin/layout.tsx's note). Deliberately manual
// records per TRD §4 ("manual MVP records") — no commission-rate business
// rule exists, so this doesn't compute one; the admin enters amounts from
// their own accounting and netAmount is just the server-side total.
// branchId is intentionally not collected here — GET /branches is
// Salon-Owner-scoped (403s for ADMIN per Salonjaa_Frontend/CLAUDE.md), so
// there's no endpoint this screen can call to list a salon's branches; the
// field is optional on the backend and left out rather than inventing one.
export default function AdminSettlementsPage() {
  const toast = useToastContext();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("PENDING");
  const [settlements, setSettlements] = useState<AdminSettlement[] | null>(null);
  const [salons, setSalons] = useState<AdminSalon[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const loadSettlements = async () => {
    setError("");
    setSettlements(null);
    try {
      const result = await apiFetch<{ data: AdminSettlement[] }>(`/admin/settlements${tab ? `?status=${tab}` : ""}`);
      setSettlements(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    loadSettlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    apiFetch<{ data: AdminSalon[] }>("/admin/salons?status=VERIFIED")
      .then((r) => setSalons(r.data))
      .catch(() => setSalons([]));
  }, []);

  const salonName = (id: string) => salons?.find((s) => s.id === id)?.name || id;

  const openCreate = () => {
    setForm(BLANK_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        salonId: form.salonId,
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd: new Date(form.periodEnd).toISOString(),
        grossAmount: Number(form.grossAmount),
      };
      if (form.commissionAmount.trim()) body.commissionAmount = Number(form.commissionAmount);
      if (form.refundAmount.trim()) body.refundAmount = Number(form.refundAmount);
      if (form.adjustmentAmount.trim()) body.adjustmentAmount = Number(form.adjustmentAmount);

      await apiFetch("/admin/settlements", { method: "POST", body: JSON.stringify(body) });
      setFormOpen(false);
      await loadSettlements();
      toast.success("Settlement created.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const markSettled = async (s: AdminSettlement) => {
    setBusyId(s.id);
    setError("");
    try {
      await apiFetch(`/admin/settlements/${s.id}/mark-settled`, { method: "POST" });
      // Refetch rather than patch in place — the row's new COMPLETED status
      // may no longer match the active status filter (e.g. viewing Pending).
      await loadSettlements();
      toast.success("Settlement marked settled.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-lg font-semibold md:text-2xl">Settlements</h1>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" disabled={!salons?.length} onClick={openCreate}>
          <Plus className="size-4" />
          New Settlement
        </Button>
      </div>

      {salons?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No verified salons to settle yet.</p>}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-gradient-to-r from-brass to-brass-bright text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && settlements === null && (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        )}

        {settlements?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Banknote className="size-8 text-accent" />
            <p className="font-semibold">Nothing here</p>
          </Card>
        )}

        <div className="grid gap-3 xl:grid-cols-2">
          {settlements?.map((s) => (
            <Card key={s.id} className="gap-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{salonName(s.salonId)}</p>
                <Badge variant={VARIANT[s.status]}>{s.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(s.periodStart)} – {formatDateTime(s.periodEnd)}
              </p>
              <p className="text-sm">
                Gross ₹{s.grossAmount} − Commission ₹{s.commissionAmount} − Refunds ₹{s.refundAmount} + Adjustments ₹{s.adjustmentAmount} ={" "}
                <span className="font-semibold">Net ₹{s.netAmount}</span>
              </p>
              {s.status !== "COMPLETED" && (
                <div className="mt-2">
                  <Button size="xs" disabled={busyId === s.id} className="bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => markSettled(s)}>
                    {busyId === s.id ? "Marking…" : "Mark settled"}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New settlement</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="settle-salon">Salon</Label>
              <select
                id="settle-salon"
                required
                value={form.salonId}
                onChange={(e) => setForm({ ...form, salonId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Select a salon
                </option>
                {salons?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settle-start">Period start</Label>
                <Input id="settle-start" type="datetime-local" required value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settle-end">Period end</Label>
                <Input id="settle-end" type="datetime-local" required value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settle-gross">Gross amount</Label>
              <Input id="settle-gross" type="number" min="0" step="0.01" required value={form.grossAmount} onChange={(e) => setForm({ ...form, grossAmount: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settle-commission">Commission</Label>
                <Input id="settle-commission" type="number" min="0" step="0.01" value={form.commissionAmount} onChange={(e) => setForm({ ...form, commissionAmount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settle-refund">Refunds</Label>
                <Input id="settle-refund" type="number" min="0" step="0.01" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settle-adjustment">Adjustment</Label>
                <Input id="settle-adjustment" type="number" step="0.01" value={form.adjustmentAmount} onChange={(e) => setForm({ ...form, adjustmentAmount: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
              {busy ? "Creating…" : "Create settlement"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
