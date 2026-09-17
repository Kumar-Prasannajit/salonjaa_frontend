"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { AdminCoupon } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BLANK_FORM = {
  couponCode: "",
  type: "FIXED" as "FIXED" | "PERCENTAGE",
  value: "",
  minimumAmount: "",
  maxDiscount: "",
  usageLimit: "",
  startsAt: "",
  expiresAt: "",
  active: true,
};

// GET/POST /admin/coupons, PATCH/DELETE /admin/coupons/:id (BUG-013 fix —
// see app/admin/layout.tsx's note). Platform-wide coupons, previously
// db:seed-only — only the customer-facing POST /payments/coupons/validate
// existed, with nothing to create/edit one anywhere in the app. couponCode
// is immutable after creation per the backend's UpdateCouponInput (no
// couponCode field) — the edit dialog shows it read-only.
export default function AdminCouponsPage() {
  const toast = useToastContext();
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: AdminCoupon[] }>("/admin/coupons");
      setCoupons(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(BLANK_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (c: AdminCoupon) => {
    setEditing(c);
    setForm({
      couponCode: c.couponCode,
      type: c.type,
      value: String(c.value),
      minimumAmount: c.minimumAmount != null ? String(c.minimumAmount) : "",
      maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : "",
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : "",
      active: c.active,
    });
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        value: Number(form.value),
      };
      if (form.minimumAmount.trim()) body.minimumAmount = Number(form.minimumAmount);
      if (form.maxDiscount.trim()) body.maxDiscount = Number(form.maxDiscount);
      if (form.usageLimit.trim()) body.usageLimit = Number(form.usageLimit);
      if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString();
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();

      if (editing) {
        body.active = form.active;
        await apiFetch(`/admin/coupons/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        body.couponCode = form.couponCode.trim().toUpperCase();
        await apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(body) });
      }
      setFormOpen(false);
      await load();
      toast.success(editing ? "Coupon updated." : "Coupon created.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: AdminCoupon) => {
    if (!window.confirm(`Delete "${c.couponCode}"?`)) return;
    setError("");
    try {
      await apiFetch(`/admin/coupons/${c.id}`, { method: "DELETE" });
      setCoupons((all) => all?.filter((x) => x.id !== c.id) || null);
      toast.success("Coupon deleted.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-lg font-semibold md:text-2xl">Coupons</h1>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={openCreate}>
          <Plus className="size-4" />
          New Coupon
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && coupons === null && (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        )}

        {coupons?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Ticket className="size-8 text-accent" />
            <p className="font-semibold">No coupons yet</p>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {coupons?.map((c) => (
            <Card key={c.id} className="gap-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{c.couponCode}</p>
                <Badge variant={c.active ? "default" : "outline"}>{c.active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {c.type === "FIXED" ? `₹${c.value} off` : `${c.value}% off`}
                {c.minimumAmount != null ? ` • min ₹${c.minimumAmount}` : ""}
                {c.maxDiscount != null ? ` • max ₹${c.maxDiscount}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Used {c.usedCount}
                {c.usageLimit != null ? `/${c.usageLimit}` : ""}
                {c.startsAt ? ` • from ${new Date(c.startsAt).toLocaleDateString()}` : ""}
                {c.expiresAt ? ` to ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="xs" variant="outline" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(c)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit coupon" : "New coupon"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Coupon code</Label>
              <Input
                id="coupon-code"
                required
                disabled={!!editing}
                value={form.couponCode}
                onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
                placeholder="FLAT50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-type">Type</Label>
                <select
                  id="coupon-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "FIXED" | "PERCENTAGE" })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="FIXED">Fixed (₹)</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-value">Value</Label>
                <Input id="coupon-value" type="number" min="0" step="0.01" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-min">Minimum amount</Label>
                <Input id="coupon-min" type="number" min="0" step="0.01" value={form.minimumAmount} onChange={(e) => setForm({ ...form, minimumAmount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-max">Max discount</Label>
                <Input id="coupon-max" type="number" min="0" step="0.01" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-limit">Usage limit</Label>
              <Input id="coupon-limit" type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-starts">Starts</Label>
                <Input id="coupon-starts" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-expires">Expires</Label>
                <Input id="coupon-expires" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v === true })} />
                Active
              </label>
            )}
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
              {busy ? "Saving…" : editing ? "Save changes" : "Create coupon"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
