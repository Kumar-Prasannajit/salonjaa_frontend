"use client";

import { FormEvent, useEffect, useState } from "react";
import { ListChecks, Plus, X } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { OwnerService, ServiceCategory, Staff } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BLANK_FORM = { categoryId: "", name: "", durationMinutes: "30", basePrice: "" };

// POST/GET/PATCH/DELETE /services (branchId-filtered) + POST/DELETE staff
// assignment. Like leave, there's no endpoint to list a service's currently
// assigned staff (service.service.ts has assign/remove only) — the "Assigned
// staff" panel below only reflects assignments made in this session.
export function ServiceManager({ branchId }: { branchId: string }) {
  const toast = useToastContext();
  const [services, setServices] = useState<OwnerService[] | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerService | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [assignServiceId, setAssignServiceId] = useState<string | null>(null);
  const [assignedByService, setAssignedByService] = useState<Record<string, Staff[]>>({});
  const [assignSelection, setAssignSelection] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [serviceResult, categoryList, staffResult] = await Promise.all([
        apiFetch<{ data: OwnerService[] }>(`/services?branchId=${branchId}`),
        apiFetch<ServiceCategory[]>("/service-categories", {}, { auth: false }),
        apiFetch<{ data: Staff[] }>(`/staff?branchId=${branchId}`),
      ]);
      setServices(serviceResult.data);
      setCategories(categoryList);
      setStaff(staffResult.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || id;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...BLANK_FORM, categoryId: categories[0]?.id || "" });
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (s: OwnerService) => {
    setEditing(s);
    setForm({ categoryId: s.categoryId, name: s.name, durationMinutes: String(s.durationMinutes), basePrice: String(s.basePrice) });
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const body: Record<string, string | number> = {
        categoryId: form.categoryId,
        name: form.name.trim(),
        durationMinutes: Number(form.durationMinutes),
        basePrice: Number(form.basePrice),
      };
      if (!editing) body.branchId = branchId;

      if (editing) {
        await apiFetch(`/services/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/services", { method: "POST", body: JSON.stringify(body) });
      }
      setFormOpen(false);
      await load();
      toast.success(editing ? "Service updated." : "Service added.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: OwnerService) => {
    if (!window.confirm(`Remove ${s.name}?`)) return;
    setError("");
    try {
      await apiFetch(`/services/${s.id}`, { method: "DELETE" });
      setServices((all) => all?.filter((x) => x.id !== s.id) || null);
      toast.success("Service removed.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    }
  };

  const assign = async (serviceId: string) => {
    if (!assignSelection) return;
    setAssignError("");
    setAssignBusy(true);
    try {
      await apiFetch(`/services/${serviceId}/staff`, { method: "POST", body: JSON.stringify({ staffId: assignSelection }) });
      const staffRow = staff.find((s) => s.id === assignSelection);
      if (staffRow) {
        setAssignedByService((prev) => ({ ...prev, [serviceId]: [...(prev[serviceId] || []), staffRow] }));
      }
      setAssignSelection("");
      toast.success("Staff assigned.");
    } catch (e) {
      const msg = messageFromError(e);
      setAssignError(msg);
      toast.error(msg);
    } finally {
      setAssignBusy(false);
    }
  };

  const unassign = async (serviceId: string, staffId: string) => {
    setAssignError("");
    try {
      await apiFetch(`/services/${serviceId}/staff/${staffId}`, { method: "DELETE" });
      setAssignedByService((prev) => ({ ...prev, [serviceId]: (prev[serviceId] || []).filter((s) => s.id !== staffId) }));
      toast.success("Staff unassigned.");
    } catch (e) {
      const msg = messageFromError(e);
      setAssignError(msg);
      toast.error(msg);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Services</h2>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" disabled={!categories.length} onClick={openCreate}>
          <Plus className="size-4" />
          Add Service
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-3 space-y-2">
        {services === null && <Skeleton className="h-12 w-full rounded-lg" />}
        {services?.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="size-4" />
            No services yet.
          </p>
        )}
        {services?.map((s) => (
          <div key={s.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryName(s.categoryId)} • {s.durationMinutes} min • ₹{s.basePrice}
                </p>
              </div>
              <Badge variant="outline">{s.status}</Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="xs" variant="outline" onClick={() => openEdit(s)}>
                Edit
              </Button>
              <Button size="xs" variant="outline" onClick={() => setAssignServiceId(assignServiceId === s.id ? null : s.id)}>
                Staff
              </Button>
              <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(s)}>
                Remove
              </Button>
            </div>

            {assignServiceId === s.id && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Only assignments made this session are listed — there&apos;s no endpoint to fetch current assignments.</p>
                {(assignedByService[s.id] || []).map((st) => (
                  <div key={st.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs">
                    <span>{st.fullName}</span>
                    <button type="button" onClick={() => unassign(s.id, st.id)} aria-label="Unassign staff" className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {assignError && (
                  <Alert variant="destructive">
                    <AlertDescription>{assignError}</AlertDescription>
                  </Alert>
                )}
                {staff.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add staff to this branch first.</p>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={assignSelection}
                      onChange={(e) => setAssignSelection(e.target.value)}
                      className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="">Choose staff…</option>
                      {staff.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" disabled={!assignSelection || assignBusy} onClick={() => assign(s.id)} className="bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
                      {assignBusy ? "Assigning…" : "Assign"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="service-category">Category</Label>
              <select
                id="service-category"
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-name">Name</Label>
              <Input id="service-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service-duration">Duration (minutes)</Label>
                <Input id="service-duration" type="number" min="1" required value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-price">Base price (₹)</Label>
                <Input id="service-price" type="number" min="1" required value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
              {busy ? "Saving…" : editing ? "Save changes" : "Add service"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
