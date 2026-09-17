"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BadgePercent,
  MapPin,
  Phone,
  Star,
  Store,
} from "lucide-react";
import { apiFetch, ApiError, messageFromError } from "@/lib/api-client";
import type { PublicBranchDetail, PublicPromotion } from "@/lib/types";
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
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setNotFound(false);
    setBranch(null);
    apiFetch<PublicBranchDetail>(
      `/public/branches/${branchId}`,
      {},
      { auth: false },
    )
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

  // Module 16/21 — GET /public/promotions?branchId= lists every active,
  // in-range promotion regardless of `featured` (that flag only decides the
  // listing-card banner elsewhere) — the full list an interested customer
  // would want once they're already looking at this specific salon.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: PublicPromotion[] }>(
      `/public/promotions?branchId=${branchId}`,
      {},
      { auth: false },
    )
      .then((result) => !cancelled && setPromotions(result.data))
      .catch(() => {
        // Non-fatal — the salon page itself already loaded fine; a promotions
        // fetch failure just means this section stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const goToServices = () => router.push(`/salons/${branchId}/services`);

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background pb-28 md:max-w-2xl lg:max-w-5xl lg:pb-16">
      <div className="flex items-center justify-between gap-3 px-5 py-3 md:px-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="rounded-full border border-border bg-background p-2"
        >
          <ArrowLeft className="size-4" />
        </button>
        {/* Module 19 — branch's own phone column, null if the owner never set one. */}
        {branch?.phone && (
          <a
            href={`tel:${branch.phone}`}
            aria-label="Call salon"
            className="rounded-full border border-border bg-background p-2"
          >
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
            <p className="text-sm text-muted-foreground">
              This salon may no longer be listed.
            </p>
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
            <img
              src={branch.coverImage}
              alt=""
              className="h-56 w-full object-cover md:h-72 md:rounded-b-xl lg:h-80 lg:rounded-xl"
            />
          ) : (
            <div className="grid h-56 w-full place-items-center bg-secondary md:h-72 md:rounded-b-xl lg:h-80 lg:rounded-xl">
              <Store
                className="size-10 text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
          )}

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 lg:px-10 lg:py-8">
            <div className="lg:col-start-2 lg:row-start-1 px-5 md:px-10 lg:px-0">
              <div className="lg:sticky lg:top-24 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-6">
                <div className="flex items-center gap-2 lg:hidden">
                  <h1 className="font-serif text-xl font-semibold">
                    {branch.branchName && branch.branchName !== branch.salonName
                      ? `${branch.salonName} · ${branch.branchName}`
                      : branch.salonName}
                  </h1>
                  {branch.verificationStatus === "VERIFIED" && (
                    <BadgeCheck className="size-5 shrink-0 text-primary" />
                  )}
                </div>
                {branch.verificationStatus === "VERIFIED" && (
                  <div className="hidden items-center gap-1.5 text-sm font-medium text-primary lg:flex">
                    <BadgeCheck className="size-4" />
                    Verified salon
                  </div>
                )}

                {/* Module 21 — same signals as components/salon-card.tsx's listing
                  row, minus activePromotion (listing-card only). UNISEX is the
                  unmarked default, same reasoning as that component. */}
                {(branch.priceTier || branch.genderServed !== "UNISEX") && (
                  <div className="mt-1.5 flex gap-1.5">
                    {branch.priceTier && (
                      <Badge variant="outline">{branch.priceTier}</Badge>
                    )}
                    {branch.genderServed !== "UNISEX" && (
                      <Badge variant="outline">
                        {branch.genderServed === "MEN"
                          ? "Men only"
                          : "Women only"}
                      </Badge>
                    )}
                  </div>
                )}
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {branch.addressLine1}, {branch.city}
                  {branch.distanceKm != null &&
                    ` • ${branch.distanceKm.toFixed(1)} km`}
                </p>
                {/* Module 19 — GET /public/branches' new salonId filter closes the
                  "View Branches" gap: list this brand's other locations on Explore. */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/explore?salonId=${branch.salonId}&salonName=${encodeURIComponent(branch.salonName)}`,
                    )
                  }
                  className="mt-1 text-sm font-medium text-primary underline underline-offset-2"
                >
                  View Other Branches
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/reviews/salon/${branch.salonId}`)
                  }
                  className="mt-2 flex items-center gap-1 text-sm"
                >
                  {branch.averageRating !== null ? (
                    <>
                      <Star className="size-4 fill-primary text-primary" />
                      <span className="font-medium">
                        {branch.averageRating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground underline underline-offset-2">
                        ({branch.reviewCount} Reviews)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground underline underline-offset-2">
                      No reviews yet
                    </span>
                  )}
                </button>

                {promotions.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {promotions.map((p) => (
                      <Card
                        key={p.id}
                        className="flex-row items-start gap-2.5 p-3"
                      >
                        <BadgePercent className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{p.title}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground">
                              {p.description}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Until {new Date(p.endsAt).toLocaleDateString()}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <Button
                  className="mt-6 hidden w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90 lg:flex"
                  onClick={goToServices}
                >
                  Book Now
                </Button>
              </div>
            </div>

            <div className="lg:col-start-1 lg:row-start-1">
              <div className="px-5 py-5 md:px-10 lg:px-0">
                <div className="hidden lg:block">
                  <h1 className="font-serif text-2xl font-semibold">
                    {branch.branchName && branch.branchName !== branch.salonName
                      ? `${branch.salonName} · ${branch.branchName}`
                      : branch.salonName}
                  </h1>
                </div>

                {branch.description && (
                  <>
                    <h2 className="mt-2 font-serif text-lg font-semibold lg:mt-6">
                      About
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {branch.description}
                    </p>
                  </>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-semibold">Services</h2>
                  {branch.services.length > 4 && (
                    <button
                      type="button"
                      onClick={goToServices}
                      className="text-sm font-medium text-primary"
                    >
                      See all
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {branch.services.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No services listed yet.
                    </p>
                  )}
                  {branch.services.slice(0, 4).map((s) => (
                    <Card
                      key={s.id}
                      className="flex-row items-center gap-3 p-3"
                    >
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote, salon-owner-supplied URL.
                        <img
                          src={s.imageUrl}
                          alt=""
                          className="size-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-secondary">
                          <Store className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.durationMinutes} min •{" "}
                          {s.variants.length > 0
                            ? `From ₹${Math.min(...s.variants.map((v) => v.price))}`
                            : `₹${s.basePrice}`}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {branch && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-border bg-background p-4 md:max-w-2xl lg:hidden">
          <Button
            className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90"
            onClick={goToServices}
          >
            Book Now
          </Button>
        </div>
      )}
    </main>
  );
}
