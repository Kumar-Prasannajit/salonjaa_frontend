"use client";

import { FormEvent, useEffect, useState } from "react";
import { BadgePercent, Plus } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { Branch, Promotion } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BLANK_FORM = { title: "", description: "", bannerImageUrl: "", startsAt: "", endsAt: "", branchIds: [] as string[], featured: false };

// GET/POST /promotions, PATCH/DELETE /promotions/:id (Module 17, owner) —
// marketing content (title/description/banner/date range) targeting one or
// more of the owner's own branches, unrelated to coupons. Not scoped to a
// single salon in the documented contract (no salonId query/body field), so
// this fetches every branch the owner has across all their salons (same
// `GET /branches` call app/owner/bookings/walk-in/page.tsx already makes)
// for the targeting checkboxes, rather than living inside one salon's page.
// `active`/manual pause isn't exposed here — frontend_handover.md only
// documents it auto-deactivating at `endsAt`, not a frontend-settable
// toggle, so nothing is invented on top of that.
export function PromotionsManager() {
  const toast = useToastContext();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [branchList, promotionList] = await Promise.all([
        apiFetch<{ data: Branch[] }>("/branches"),
        apiFetch<{ data: Promotion[] }>("/promotions"),
      ]);
      setBranches(branchList.data);
      setPromotions(promotionList.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const branchName = (id: string) => branches?.find((b) => b.id === id)?.name || id;

  const openCreate = () => {
    setEditing(null);
    setForm(BLANK_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description || "",
      bannerImageUrl: p.bannerImageUrl || "",
      startsAt: p.startsAt.slice(0, 16),
      endsAt: p.endsAt.slice(0, 16),
      branchIds: p.branchIds,
      featured: p.featured,
    });
    setFormError("");
    setFormOpen(true);
  };

  const toggleBranch = (id: string) =>
    setForm((f) => ({ ...f, branchIds: f.branchIds.includes(id) ? f.branchIds.filter((x) => x !== id) : [...f.branchIds, id] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (form.branchIds.length === 0) {
      setFormError("Select at least one branch.");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        branchIds: form.branchIds,
        featured: form.featured,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.bannerImageUrl.trim()) body.bannerImageUrl = form.bannerImageUrl.trim();

      if (editing) {
        await apiFetch(`/promotions/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/promotions", { method: "POST", body: JSON.stringify(body) });
      }
      setFormOpen(false);
      await load();
      toast.success(editing ? "Promotion updated." : "Promotion created.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Promotion) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    setError("");
    try {
      await apiFetch(`/promotions/${p.id}`, { method: "DELETE" });
      setPromotions((all) => all?.filter((x) => x.id !== p.id) || null);
      toast.success("Promotion deleted.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgePercent className="size-4 text-primary" />
          <h2 className="font-serif font-semibold">Promotions</h2>
        </div>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" disabled={!branches?.length} onClick={openCreate}>
          <Plus className="size-4" />
          New Promotion
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && branches?.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Add a branch first to create a promotion.</p>}

      <div className="mt-3 space-y-2">
        {promotions === null && <Skeleton className="h-16 w-full rounded-lg" />}
        {promotions?.length === 0 && <p className="text-sm text-muted-foreground">No promotions yet.</p>}
        {promotions?.map((p) => (
          <div key={p.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {p.title} {p.featured && <Badge className="ml-1 align-middle">Featured</Badge>}
                </p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(p.startsAt).toLocaleDateString()} – {new Date(p.endsAt).toLocaleDateString()} • {p.branchIds.map(branchName).join(", ")}
                </p>
              </div>
              <Badge variant={p.active ? "default" : "outline"}>{p.active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="xs" variant="outline" onClick={() => openEdit(p)}>
                Edit
              </Button>
              <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(p)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit promotion" : "New promotion"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="promo-title">Title</Label>
              <Input id="promo-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Festive Season Special" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-description">Description</Label>
              <textarea
                id="promo-description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-banner">Banner image URL</Label>
              <Input id="promo-banner" value={form.bannerImageUrl} onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo-starts">Starts</Label>
                <Input id="promo-starts" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-ends">Ends</Label>
                <Input id="promo-ends" type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Branches</Label>
              <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                {branches?.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.branchIds.includes(b.id)} onCheckedChange={() => toggleBranch(b.id)} />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v === true })} />
              Feature on listing cards
            </label>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
              {busy ? "Saving…" : editing ? "Save changes" : "Create promotion"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
