"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, MapPin, Phone, Star, Store } from "lucide-react";
import { apiFetch, ApiError, messageFromError } from "@/lib/api-client";
import type { PublicBranchDetail } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// docs/designs/03-salon-details.jpeg, against the real GET /public/branches/:branchId
// shape (Module 10). Two deliberate omissions from the literal design, both
// because the field doesn't exist on this response: no "20% OFF" badge (no
// discount/promo field anywhere — see docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md),
// and no "Hygiene · Expert Staff · Premium Products" amenity chips (nothing on
// the response backs them). The design's inline per-service "+" quick-add
// buttons are also dropped in favor of routing straight to Select Services —
// keeping multi-select state on one screen avoids two pages disagreeing about
// what's picked.
export default function SalonDetailsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();

  const [branch, setBranch] = useState<PublicBranchDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setNotFound(false);
    setBranch(null);
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

  const goToServices = () => router.push(`/salons/${branchId}/services`);

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background pb-28 md:max-w-2xl">
      <div className="flex items-center justify-between gap-3 px-5 py-3 md:px-10">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border bg-background p-2">
          <ArrowLeft className="size-4" />
        </button>
        {/* Module 19 — branch's own phone column, null if the owner never set one. */}
        {branch?.phone && (
          <a href={`tel:${branch.phone}`} aria-label="Call salon" className="rounded-full border border-border bg-background p-2">
            <Phone className="size-4" />
          </a>
        )}
      </div>

      {error && (
        <div className="px-5 md:px-10">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {notFound && (
        <div className="px-5 md:px-10">
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Store className="size-8 text-accent" />
            <p className="font-semibold">Salon not found</p>
            <p className="text-sm text-muted-foreground">This salon may no longer be listed.</p>
          </Card>
        </div>
      )}

      {!error && !notFound && branch === null && (
        <div className="space-y-4 px-5 md:px-10">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      {branch && (
        <>
          {branch.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote, salon-owner-supplied URL; no next.config.js domain allowlist for these yet.
            <img src={branch.coverImage} alt="" className="h-56 w-full object-cover md:h-72 md:rounded-b-xl" />
          ) : (
            <div className="grid h-56 w-full place-items-center bg-secondary md:h-72 md:rounded-b-xl">
              <Store className="size-10 text-muted-foreground" strokeWidth={1.5} />
            </div>
          )}

          <div className="px-5 py-5 md:px-10">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">
                {branch.branchName && branch.branchName !== branch.salonName ? `${branch.salonName} · ${branch.branchName}` : branch.salonName}
              </h1>
              {branch.verificationStatus === "VERIFIED" && <BadgeCheck className="size-5 shrink-0 text-primary" />}
            </div>
            {/* Module 21 — same signals as components/salon-card.tsx's listing
                row, minus activePromotion (listing-card only). UNISEX is the
                unmarked default, same reasoning as that component. */}
            {(branch.priceTier || branch.genderServed !== "UNISEX") && (
              <div className="mt-1.5 flex gap-1.5">
                {branch.priceTier && <Badge variant="outline">{branch.priceTier}</Badge>}
                {branch.genderServed !== "UNISEX" && <Badge variant="outline">{branch.genderServed === "MEN" ? "Men only" : "Women only"}</Badge>}
              </div>
            )}
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {branch.addressLine1}, {branch.city}
              {branch.distanceKm != null && ` • ${branch.distanceKm.toFixed(1)} km`}
            </p>
            {/* Module 19 — GET /public/branches' new salonId filter closes the
                "View Branches" gap: list this brand's other locations on Explore. */}
            <button
              type="button"
              onClick={() => router.push(`/explore?salonId=${branch.salonId}&salonName=${encodeURIComponent(branch.salonName)}`)}
              className="mt-1 text-sm font-medium text-primary underline underline-offset-2"
            >
              View Other Branches
            </button>
            <button
              type="button"
              onClick={() => router.push(`/reviews/salon/${branch.salonId}`)}
              className="mt-2 flex items-center gap-1 text-sm"
            >
              {branch.averageRating !== null ? (
                <>
                  <Star className="size-4 fill-primary text-primary" />
                  <span className="font-medium">{branch.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground underline underline-offset-2">({branch.reviewCount} Reviews)</span>
                </>
              ) : (
                <span className="text-muted-foreground underline underline-offset-2">No reviews yet</span>
              )}
            </button>

            {branch.description && (
              <>
                <h2 className="mt-6 font-semibold">About</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{branch.description}</p>
              </>
            )}

            <div className="mt-6 flex items-center justify-between">
              <h2 className="font-semibold">Services</h2>
              {branch.services.length > 4 && (
                <button type="button" onClick={goToServices} className="text-sm font-medium text-primary">
                  See all
                </button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {branch.services.length === 0 && <p className="text-sm text-muted-foreground">No services listed yet.</p>}
              {branch.services.slice(0, 4).map((s) => (
                <Card key={s.id} className="flex-row items-center gap-3 p-3">
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote, salon-owner-supplied URL.
                    <img src={s.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-secondary">
                      <Store className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.durationMinutes} min • ₹{s.basePrice}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-border bg-background p-4 md:max-w-2xl">
            <Button className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={goToServices}>
              Book Now
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
