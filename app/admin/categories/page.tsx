"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { AdminCategory } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BLANK_FORM = { name: "", slug: "", icon: "", status: "ACTIVE" as "ACTIVE" | "INACTIVE" };

// GET/POST /admin/categories, PATCH/DELETE /admin/categories/:id (BUG-013
// fix — see app/admin/layout.tsx's note). Platform-wide service categories,
// previously db:seed-only with no CRUD reachable through the app at all.
// Follows the same list+dialog+delete shape as components/owner/
// promotions-manager.tsx.
export default function AdminCategoriesPage() {
  const toast = useToastContext();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: AdminCategory[] }>("/admin/categories");
      setCategories(result.data);
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

  const openEdit = (c: AdminCategory) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, icon: c.icon || "", status: c.status });
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = { name: form.name.trim(), status: form.status };
        if (form.slug.trim()) body.slug = form.slug.trim();
        if (form.icon.trim()) body.icon = form.icon.trim();
        await apiFetch(`/admin/categories/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        const body: Record<string, unknown> = { name: form.name.trim() };
        if (form.slug.trim()) body.slug = form.slug.trim();
        if (form.icon.trim()) body.icon = form.icon.trim();
        await apiFetch("/admin/categories", { method: "POST", body: JSON.stringify(body) });
      }
      setFormOpen(false);
      await load();
      toast.success(editing ? "Category updated." : "Category created.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: AdminCategory) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    setError("");
    try {
      await apiFetch(`/admin/categories/${c.id}`, { method: "DELETE" });
      setCategories((all) => all?.filter((x) => x.id !== c.id) || null);
      toast.success("Category deleted.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-lg font-semibold md:text-2xl">Service Categories</h1>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={openCreate}>
          <Plus className="size-4" />
          New Category
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && categories === null && (
          <>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </>
        )}

        {categories?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Tag className="size-8 text-accent" />
            <p className="font-semibold">No categories yet</p>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories?.map((c) => (
            <Card key={c.id} className="gap-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{c.name}</p>
                <Badge variant={c.status === "ACTIVE" ? "default" : "outline"}>{c.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">/{c.slug}{c.icon ? ` • ${c.icon}` : ""}</p>
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
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nail Art" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input id="cat-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name if left blank" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon">Icon</Label>
              <Input id="cat-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. scissors, spa" />
            </div>
            {editing && (
              <div className="space-y-2">
                <Label htmlFor="cat-status">Status</Label>
                <select
                  id="cat-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
              {busy ? "Saving…" : editing ? "Save changes" : "Create category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
