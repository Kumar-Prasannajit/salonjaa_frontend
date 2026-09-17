"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { PublicBranchSummary } from "@/lib/types";
import { useGeolocation } from "@/hooks/use-geolocation";
import { SalonCard } from "@/components/salon-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// docs/designs/04-nearby-salons-based-on-service.jpeg, against the real
// GET /public/branches (Module 10). No "Change Location" footer — same
// reasoning as Home, there's no geocoding to produce a place name from
// coordinates. `q`/`serviceCategoryId` seed from the URL so Home's search box
// and category chips land here pre-filled/pre-filtered. `salonId` (Module
// 19) does the same for Salon Details' "View Other Branches" link — there's
// no public endpoint to look up a salon's name from just its ID, so
// `salonName` rides along in the URL from the page that already had it
// loaded, purely for the heading; it's never sent to the API.
const SORTS = [
  { key: "popular", label: "Popular" },
  { key: "rating", label: "Rating" },
  { key: "distance", label: "Distance" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function ExploreContent() {
  const searchParams = useSearchParams();
  const geo = useGeolocation();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sort, setSort] = useState<SortKey>("popular");
  const serviceCategoryId = searchParams.get("serviceCategoryId") || undefined;
  const salonId = searchParams.get("salonId") || undefined;
  const salonName = searchParams.get("salonName") || undefined;

  const [branches, setBranches] = useState<PublicBranchSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (sort === "distance" && geo.status === "idle") geo.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  useEffect(() => {
    let cancelled = false;
    setError("");
    const effectiveSort = sort === "distance" && !geo.coords ? "popular" : sort;
    const params = new URLSearchParams({ sort: effectiveSort });
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (serviceCategoryId) params.set("serviceCategoryId", serviceCategoryId);
    if (salonId) params.set("salonId", salonId);
    if (effectiveSort === "distance" && geo.coords) {
      params.set("lat", String(geo.coords.lat));
      params.set("lng", String(geo.coords.lng));
    }
    apiFetch<PublicBranchSummary[]>(`/public/branches?${params}`, {}, { auth: false })
      .then((list) => !cancelled && setBranches(list))
      .catch((e) => !cancelled && setError(messageFromError(e)));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, serviceCategoryId, salonId, sort, geo.coords]);

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12 lg:max-w-5xl">
      <h1 className="font-serif text-lg font-semibold md:text-2xl">{salonId ? `${salonName || "Salon"} — Other Branches` : "Nearby Salons"}</h1>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for salons, services…" className="h-11 rounded-xl pl-9" />
      </div>

      <div className="mt-3 flex gap-2">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              sort === s.key ? "bg-gradient-to-r from-brass to-brass-bright text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sort === "distance" && geo.status === "denied" && (
        <p className="mt-2 text-xs text-muted-foreground">Location access denied — showing popular salons instead.</p>
      )}

      <div className="mt-6 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && branches === null && (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        )}

        {branches !== null && (
          <p className="text-sm text-primary">
            {branches.length}
            {branches.length >= 20 ? "+" : ""} salon{branches.length === 1 ? "" : "s"} found
          </p>
        )}

        {branches !== null && branches.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <SearchX className="size-8 text-accent" />
            <p className="font-semibold">No salons found</p>
            <p className="text-sm text-muted-foreground">
              {salonId ? "This brand has no other listed branches yet." : "Try a different search or clear your filters."}
            </p>
          </Card>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {branches?.map((b) => (
            <SalonCard key={b.branchId} branch={b} variant="row" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
