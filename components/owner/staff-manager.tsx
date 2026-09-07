"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Users, X } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { Staff, StaffLeave } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BLANK_FORM = { fullName: "", phone: "", staffType: "NORMAL" as "NORMAL" | "STAR", experienceYears: "", salary: "" };

// POST/GET/PATCH/DELETE /staff (branchId-filtered) + POST/DELETE staff leave.
// Leave has no listing endpoint (staff.service.ts's create/cancelLeave only —
// see PROGRESS.md, no GET anywhere) so, like the holidays card, only leave
// created in this session is shown/cancellable here.
export function StaffManager({ branchId }: { branchId: string }) {
  const toast = useToastContext();
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [leaveStaffId, setLeaveStaffId] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<Record<string, StaffLeave[]>>({});
  const [leaveForm, setLeaveForm] = useState({ startDateTime: "", endDateTime: "", reason: "" });
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: Staff[] }>(`/staff?branchId=${branchId}`);
      setStaff(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const openCreate = () => {
    setEditing(null);
    setForm(BLANK_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditing(s);
    setForm({
      fullName: s.fullName,
      phone: s.phone || "",
      staffType: s.staffType,
      experienceYears: s.experienceYears?.toString() || "",
      salary: s.salary?.toString() || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const body: Record<string, string | number> = {
        fullName: form.fullName.trim(),
        staffType: form.staffType,
      };
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.experienceYears.trim()) body.experienceYears = Number(form.experienceYears);
      if (form.salary.trim()) body.salary = Number(form.salary);
      if (!editing) body.branchId = branchId;

      if (editing) {
        await apiFetch(`/staff/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/staff", { method: "POST", body: JSON.stringify(body) });
      }
      setFormOpen(false);
      await load();
      toast.success(editing ? "Staff updated." : "Staff added.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: Staff) => {
    if (!window.confirm(`Remove ${s.fullName}?`)) return;
    setError("");
    try {
      await apiFetch(`/staff/${s.id}`, { method: "DELETE" });
      setStaff((all) => all?.filter((x) => x.id !== s.id) || null);
      toast.success("Staff removed.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    }
  };

  const addLeave = async (e: FormEvent) => {
    e.preventDefault();
    if (!leaveStaffId) return;
    setLeaveError("");
    setLeaveBusy(true);
    try {
      const body: Record<string, string> = {
        startDateTime: new Date(leaveForm.startDateTime).toISOString(),
        endDateTime: new Date(leaveForm.endDateTime).toISOString(),
      };
      if (leaveForm.reason.trim()) body.reason = leaveForm.reason.trim();
      const result = await apiFetch<{ data: StaffLeave }>(`/staff/${leaveStaffId}/leave`, { method: "POST", body: JSON.stringify(body) });
      setLeaves((prev) => ({ ...prev, [leaveStaffId]: [...(prev[leaveStaffId] || []), result.data] }));
      setLeaveForm({ startDateTime: "", endDateTime: "", reason: "" });
      toast.success("Leave added.");
    } catch (e) {
      const msg = messageFromError(e);
      setLeaveError(msg);
      toast.error(msg);
    } finally {
      setLeaveBusy(false);
    }
  };

  const cancelLeave = async (staffId: string, leaveId: string) => {
    setLeaveError("");
    try {
      await apiFetch(`/staff/${staffId}/leave/${leaveId}`, { method: "DELETE" });
      setLeaves((prev) => ({ ...prev, [staffId]: (prev[staffId] || []).filter((l) => l.id !== leaveId) }));
      toast.success("Leave cancelled.");
    } catch (e) {
      const msg = messageFromError(e);
      setLeaveError(msg);
      toast.error(msg);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Staff</h2>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={openCreate}>
          <Plus className="size-4" />
          Add Staff
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-3 space-y-2">
        {staff === null && <Skeleton className="h-12 w-full rounded-lg" />}
        {staff?.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            No staff yet.
          </p>
        )}
        {staff?.map((s) => (
          <div key={s.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{s.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {s.staffType} • {s.phone || "no phone"}
                  {s.experienceYears != null ? ` • ${s.experienceYears}y exp` : ""}
                </p>
              </div>
              <Badge variant="outline">{s.status}</Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="xs" variant="outline" onClick={() => openEdit(s)}>
                Edit
              </Button>
              <Button size="xs" variant="outline" onClick={() => setLeaveStaffId(leaveStaffId === s.id ? null : s.id)}>
                Leave
              </Button>
              <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(s)}>
                Remove
              </Button>
            </div>

            {leaveStaffId === s.id && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Only leave added this session is listed — there&apos;s no endpoint to fetch existing leave.</p>
                {(leaves[s.id] || []).map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs">
                    <span>
                      {new Date(l.startDateTime).toLocaleString()} → {new Date(l.endDateTime).toLocaleString()}
                      {l.reason ? ` — ${l.reason}` : ""}
                    </span>
                    <button type="button" onClick={() => cancelLeave(s.id, l.id)} aria-label="Cancel leave" className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {leaveError && (
                  <Alert variant="destructive">
                    <AlertDescription>{leaveError}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={addLeave} className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`leave-start-${s.id}`} className="text-xs">
                      Start
                    </Label>
                    <Input
                      id={`leave-start-${s.id}`}
                      type="datetime-local"
                      required
                      value={leaveForm.startDateTime}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDateTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`leave-end-${s.id}`} className="text-xs">
                      End
                    </Label>
                    <Input
                      id={`leave-end-${s.id}`}
                      type="datetime-local"
                      required
                      value={leaveForm.endDateTime}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDateTime: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`leave-reason-${s.id}`} className="text-xs">
                      Reason
                    </Label>
                    <Input id={`leave-reason-${s.id}`} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                  </div>
                  <Button type="submit" size="sm" disabled={leaveBusy} className="col-span-2 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
                    {leaveBusy ? "Adding…" : "Add leave"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit staff" : "Add staff"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full name</Label>
              <Input id="staff-name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input id="staff-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-type">Staff type</Label>
              <select
                id="staff-type"
                value={form.staffType}
                onChange={(e) => setForm({ ...form, staffType: e.target.value as "NORMAL" | "STAR" })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="NORMAL">Normal</option>
                <option value="STAR">Star</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-experience">Experience (years)</Label>
                <Input id="staff-experience" type="number" min="0" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-salary">Salary</Label>
                <Input id="staff-salary" type="number" min="0" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
              {busy ? "Saving…" : editing ? "Save changes" : "Add staff"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
