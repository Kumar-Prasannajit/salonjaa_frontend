"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { SlotTemplate } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BLANK_FORM = { name: "", startTime: "09:00", endTime: "21:00", slotDurationMinutes: "30" };

// GET/POST /branches/:id/slot-templates, PATCH/DELETE .../slot-templates/:templateId
// (Module 17) — replaces the fixed 30-minute interval GET /availability/slots
// used everywhere before, but only for a branch that actually adds one or
// more *active* templates; a branch with none keeps the old behavior,
// unchanged. Editing here is scoped to the `active` toggle (the one field
// meant to be flipped without recreating a template) plus delete — renaming
// or reshaping a template's own start/end/duration isn't exposed since no
// design or client request called for it, only create/pause/remove.
export function BranchSlotTemplatesCard({ branchId }: { branchId: string }) {
  const toast = useToastContext();
  const [templates, setTemplates] = useState<SlotTemplate[] | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: SlotTemplate[] }>(`/branches/${branchId}/slot-templates`);
      setTemplates(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        slotDurationMinutes: Number(form.slotDurationMinutes),
      };
      const result = await apiFetch<{ data: SlotTemplate }>(`/branches/${branchId}/slot-templates`, { method: "POST", body: JSON.stringify(body) });
      setTemplates((t) => [...(t || []), result.data]);
      setForm(BLANK_FORM);
      toast.success("Slot template added.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (t: SlotTemplate) => {
    setTogglingId(t.id);
    setError("");
    try {
      const result = await apiFetch<{ data: SlotTemplate }>(`/branches/${branchId}/slot-templates/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !t.active }),
      });
      setTemplates((all) => all?.map((x) => (x.id === t.id ? result.data : x)) || null);
      toast.success(result.data.active ? "Template activated." : "Template paused.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (t: SlotTemplate) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    setRemovingId(t.id);
    setError("");
    try {
      await apiFetch(`/branches/${branchId}/slot-templates/${t.id}`, { method: "DELETE" });
      setTemplates((all) => all?.filter((x) => x.id !== t.id) || null);
      toast.success("Template deleted.");
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
      <h2 className="font-serif font-semibold">Slot Templates</h2>
      <p className="text-xs text-muted-foreground">
        No active templates: this branch keeps the default fixed 30-minute interval across its opening hours. Add one or more to override it.
      </p>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-3 space-y-2">
        {templates === null && <Skeleton className="h-12 w-full rounded-lg" />}
        {templates?.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            No slot templates yet.
          </p>
        )}
        {templates?.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {t.startTime}–{t.endTime} • every {t.slotDurationMinutes} min
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => toggleActive(t)} disabled={togglingId === t.id}>
                <Badge variant={t.active ? "default" : "outline"}>{t.active ? "Active" : "Paused"}</Badge>
              </button>
              <button
                type="button"
                onClick={() => remove(t)}
                disabled={removingId === t.id}
                aria-label="Delete template"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="mt-4 space-y-3 border-t border-border pt-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="template-name">Name</Label>
          <Input id="template-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Morning shift" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="template-start">Start</Label>
            <Input id="template-start" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-end">End</Label>
            <Input id="template-end" type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-duration">Slot (min)</Label>
            <Input
              id="template-duration"
              type="number"
              min="5"
              required
              value={form.slotDurationMinutes}
              onChange={(e) => setForm({ ...form, slotDurationMinutes: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={busy} className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
          <Plus className="size-4" />
          {busy ? "Adding…" : "Add Template"}
        </Button>
      </form>
    </Card>
  );
}
