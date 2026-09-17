"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPinned, Plus, Trash2 } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { Branch, Salon } from "@/lib/types";
import { SalonGalleryCard } from "@/components/owner/salon-gallery-card";
import { SalonAnalyticsCard } from "@/components/owner/salon-analytics-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VERIFICATION_VARIANT: Record<Salon["verificationStatus"], "default" | "destructive" | "outline"> = {
  PENDING: "outline",
  VERIFIED: "default",
  REJECTED: "destructive",
};

// GET/PATCH/DELETE /salons/:salonId + GET /branches?salonId=. Only
// name/description/logo/coverImage are ever PATCH-able (salon.validator.ts's
// updateSalonSchema) — verificationStatus/status are Admin-only, shown
// read-only here per the task's "show verificationStatus prominently" ask.
export default function OwnerSalonDetailPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", logo: "", coverImage: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoadError("");
    try {
      const [salonResult, branchList] = await Promise.all([
        apiFetch<{ data: Salon }>(`/salons/${salonId}`),
        apiFetch<{ data: Branch[] }>(`/branches?salonId=${salonId}`),
      ]);
      setSalon(salonResult.data);
      setForm({
        name: salonResult.data.name,
        description: salonResult.data.description || "",
        logo: salonResult.data.logo || "",
        coverImage: salonResult.data.coverImage || "",
      });
      setBranches(branchList.data);
    } catch (e) {
      setLoadError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  const saveSalon = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const body: Record<string, string> = { name: form.name.trim() };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.logo.trim()) body.logo = form.logo.trim();
      if (form.coverImage.trim()) body.coverImage = form.coverImage.trim();
      const result = await apiFetch<{ data: Salon }>(`/salons/${salonId}`, { method: "PATCH", body: JSON.stringify(body) });
      setSalon(result.data);
      setEditing(false);
      toast.success("Salon updated.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const removeSalon = async () => {
    if (!window.confirm("Delete this salon? This can't be undone.")) return;
    setDeleting(true);
    try {
      await apiFetch(`/salons/${salonId}`, { method: "DELETE" });
      toast.success("Salon deleted.");
      router.replace("/owner/salons");
    } catch (e) {
      const msg = messageFromError(e);
      setLoadError(msg);
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <main>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/owner/salons")} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 truncate font-serif text-lg font-semibold md:text-2xl">{salon?.name || "Salon"}</h1>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !salon && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {salon && (
        <div className="mt-6 max-w-5xl space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={VERIFICATION_VARIANT[salon.verificationStatus]}>{salon.verificationStatus}</Badge>
                <Badge variant="outline">{salon.status}</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
                {editing ? "Cancel" : "Edit"}
              </Button>
            </div>
            {salon.verificationStatus === "REJECTED" && salon.verificationReason && (
              <p className="mt-3 text-sm text-destructive">Reason: {salon.verificationReason}</p>
            )}
            {salon.verificationStatus === "PENDING" && (
              <p className="mt-3 text-sm text-muted-foreground">Invisible to customers until an Admin verifies it.</p>
            )}

            {editing ? (
              <form onSubmit={saveSalon} className="mt-4 space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="edit-salon-name">Name</Label>
                  <Input id="edit-salon-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-salon-description">Description</Label>
                  <textarea
                    id="edit-salon-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-salon-logo">Logo URL</Label>
                  <Input id="edit-salon-logo" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-salon-cover">Cover image URL</Label>
                  <Input id="edit-salon-cover" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </form>
            ) : (
              salon.description && <p className="mt-3 text-sm text-muted-foreground">{salon.description}</p>
            )}
          </Card>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Branches</h2>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => router.push(`/owner/salons/${salonId}/branches/new`)}>
                <Plus className="size-4" />
                New Branch
              </Button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {branches === null && <Skeleton className="h-16 w-full rounded-xl" />}
              {branches?.length === 0 && (
                <Card className="flex flex-col items-center gap-3 border-dashed p-8 text-center sm:col-span-2">
                  <MapPinned className="size-7 text-accent" />
                  <p className="font-semibold">No branches yet</p>
                  <p className="text-sm text-muted-foreground">A salon needs at least one branch to take bookings.</p>
                </Card>
              )}
              {branches?.map((b) => (
                <Card key={b.id} className="cursor-pointer gap-1 p-4 transition-colors hover:bg-accent/40" onClick={() => router.push(`/owner/branches/${b.id}`)}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{b.name}</p>
                    <Badge variant="outline">{b.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {b.addressLine1}, {b.city}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <SalonAnalyticsCard salonId={salonId} />
          <SalonGalleryCard salonId={salonId} />

          <Button variant="ghost" className="w-full gap-1.5 text-destructive hover:text-destructive" disabled={deleting} onClick={removeSalon}>
            <Trash2 className="size-4" />
            {deleting ? "Deleting…" : "Delete salon"}
          </Button>
        </div>
      )}
    </main>
  );
}
