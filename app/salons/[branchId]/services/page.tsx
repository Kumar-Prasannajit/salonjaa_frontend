"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Check, Plus, Store } from "lucide-react";
import { apiFetch, ApiError, messageFromError } from "@/lib/api-client";
import type { PublicBranchDetail, PublicService } from "@/lib/types";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// docs/designs/05-select-service.jpeg. This is the real hand-off into the
// booking flow that app/book/start/page.tsx used to fake manually — Next
// below calls the exact same useBookingDraft().setServices(branchId,
// salonId, services) the dev form did, so Choose Stylist/Slot/Checkout
// (Modules 4-7) need no changes at all. The category chip row is derived
// from this branch's own services (not a second GET /service-categories
// call) so it's never showing a category this branch doesn't actually
// offer.
export default function SelectServicesPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const { setServices } = useBookingDraft();

  const [branch, setBranch] = useState<PublicBranchDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    apiFetch<PublicBranchDetail>(`/public/branches/${branchId}`, {}, { auth: false })
      .then((result) => !cancelled && setBranch(result))
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(messageFromError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const categories = useMemo(() => {
    if (!branch) return [];
    const seen = new Map<string, string>();
    for (const s of branch.services) if (!seen.has(s.categoryId)) seen.set(s.categoryId, s.categoryName);
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [branch]);

  const visibleServices = useMemo(() => {
    const all = branch?.services ?? [];
    return category ? all.filter((s) => s.categoryId === category) : all;
  }, [branch, category]);

  const selected: PublicService[] = useMemo(() => (branch?.services ?? []).filter((s) => selectedIds.has(s.id)), [branch, selectedIds]);
  const total = selected.reduce((sum, s) => sum + s.basePrice, 0);

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const next = () => {
    if (!branch || selected.length === 0) return;
    setServices(
      branch.branchId,
      branch.salonId,
      selected.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, basePrice: s.basePrice }))
    );
    router.push(`/book/${branch.branchId}/stylist`);
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 pb-32 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Select Services</h1>
        <div className="size-8" />
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notFound && (
        <Card className="mt-6 flex flex-col items-center gap-3 border-dashed p-10 text-center">
          <Store className="size-8 text-accent" />
          <p className="font-semibold">Salon not found</p>
          <p className="text-sm text-muted-foreground">This salon may no longer be listed.</p>
        </Card>
      )}

      {!error && !notFound && branch === null && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {branch && (
        <>
          {categories.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === null ? "border border-primary text-primary" : "border border-border text-muted-foreground"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    category === c.id ? "border border-primary text-primary" : "border border-border text-muted-foreground"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {visibleServices.length === 0 && <p className="text-sm text-muted-foreground">No services in this category.</p>}
            {visibleServices.map((s) => {
              const isSelected = selectedIds.has(s.id);
              return (
                <Card key={s.id} onClick={() => toggle(s.id)} className="cursor-pointer flex-row items-center gap-3 p-3">
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote, salon-owner-supplied URL.
                    <img src={s.imageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-secondary">
                      <Store className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.durationMinutes} min • ₹{s.basePrice}
                    </p>
                  </div>
                  <div
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      isSelected ? "bg-gradient-to-r from-gold to-gold-bright text-primary-foreground" : "border border-border"
                    }`}
                  >
                    {isSelected ? <Check className="size-4" /> : <Plus className="size-4 text-muted-foreground" />}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md space-y-3 border-t border-border bg-background p-4 md:max-w-2xl">
            {selected.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {selected.length} Service{selected.length === 1 ? "" : "s"} Selected
                  </p>
                  <p className="truncate text-muted-foreground">{selected.map((s) => s.name).join(", ")}</p>
                </div>
                <span className="shrink-0 font-semibold">₹{total}</span>
              </div>
            )}
            <Button
              className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
              disabled={selected.length === 0}
              onClick={next}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
