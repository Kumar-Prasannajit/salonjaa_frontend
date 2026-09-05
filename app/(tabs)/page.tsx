"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Brush, Flower2, Hand, LocateFixed, Palette, Scissors, Search, SlidersHorizontal, Sparkles, Spool, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { PublicBranchSummary, ServiceCategory } from "@/lib/types";
import { useAccountContext } from "@/hooks/account-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { SalonCard } from "@/components/salon-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// docs/designs/02-profile-dashboard.jpeg, against the real GET /public/branches
// and GET /service-categories (Module 10). Two deliberate deviations from the
// literal design: (1) no "Hyderabad, Banjara Hills" location line or
// notification bell — there's no geocoding or customer-notifications endpoint
// anywhere to back either, so a "Use my location" pill (real device
// coordinates via hooks/use-geolocation.ts) replaces the fake place name; (2)
// frontend_handover.md claims `icon` is always null, but the live seed data
// actually returns short semantic strings (e.g. "scissors", "spa") — this maps
// those real values to a Lucide icon, with a generic fallback for any string
// this list doesn't recognize (a new category added server-side shouldn't
// break the chip row).
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  razor: Scissors,
  palette: Palette,
  sparkles: Sparkles,
  hand: Hand,
  spa: Flower2,
  makeup: Brush,
  thread: Spool,
};

function categoryIcon(icon: string | null): LucideIcon {
  return (icon && CATEGORY_ICONS[icon.trim().toLowerCase()]) || Sparkles;
}

export default function HomePage() {
  const router = useRouter();
  const account = useAccountContext();
  const geo = useGeolocation();

  const [query, setQuery] = useState("");
  const [branches, setBranches] = useState<PublicBranchSummary[] | null>(null);
  const [branchesError, setBranchesError] = useState("");
  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBranchesError("");
    const params = new URLSearchParams({ sort: geo.coords ? "distance" : "popular" });
    if (geo.coords) {
      params.set("lat", String(geo.coords.lat));
      params.set("lng", String(geo.coords.lng));
    }
    apiFetch<PublicBranchSummary[]>(`/public/branches?${params}`, {}, { auth: false })
      .then((list) => !cancelled && setBranches(list))
      .catch((e) => !cancelled && setBranchesError(messageFromError(e)));
    return () => {
      cancelled = true;
    };
  }, [geo.coords]);

  useEffect(() => {
    apiFetch<ServiceCategory[]>("/service-categories", {}, { auth: false })
      .then((list) => setCategories(list))
      .catch(() => setCategories([]));
  }, []);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : "/explore");
  };

  return (
    <main className="px-5 py-6 md:px-10 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},</p>
          <p className="text-xl font-bold">Looking Good! ✨</p>
        </div>
        <button type="button" onClick={() => router.push("/profile")} aria-label="Profile">
          <Avatar size="lg" className="border-2 border-primary/40">
            <AvatarFallback className="bg-secondary font-semibold">{account.initials}</AvatarFallback>
          </Avatar>
        </button>
      </div>

      <button
        type="button"
        onClick={geo.request}
        disabled={geo.status === "loading"}
        className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground disabled:opacity-60"
      >
        <LocateFixed className="size-3.5 text-primary" />
        {geo.status === "granted"
          ? "Sorted by distance near you"
          : geo.status === "loading"
            ? "Finding your location…"
            : geo.status === "denied" || geo.status === "unavailable"
              ? "Location unavailable — showing popular salons"
              : "Use my location to sort by distance"}
      </button>

      <form onSubmit={submitSearch} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for salons, services…"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => router.push("/explore")}
          aria-label="Filters"
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-border"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-semibold">Popular Near You</h2>
        <button type="button" onClick={() => router.push("/explore")} className="text-sm font-medium text-primary">
          See all
        </button>
      </div>

      <div className="mt-3">
        {branchesError && (
          <Alert variant="destructive">
            <AlertDescription>{branchesError}</AlertDescription>
          </Alert>
        )}
        {!branchesError && branches === null && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            <Skeleton className="h-44 w-44 shrink-0 rounded-xl" />
            <Skeleton className="h-44 w-44 shrink-0 rounded-xl" />
          </div>
        )}
        {branches !== null && branches.length === 0 && <p className="text-sm text-muted-foreground">No salons found near you yet.</p>}
        {branches !== null && branches.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {branches.slice(0, 6).map((b) => (
              <SalonCard key={b.branchId} branch={b} variant="grid" />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-semibold">Top Services</h2>
        <button type="button" onClick={() => router.push("/explore")} className="text-sm font-medium text-primary">
          See all
        </button>
      </div>

      <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
        {categories === null && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="size-16 shrink-0 rounded-full" />)}
        {categories?.slice(0, 5).map((c) => {
          const Icon = categoryIcon(c.icon);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => router.push(`/explore?serviceCategoryId=${c.id}`)}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <span className="grid size-16 place-items-center rounded-full bg-secondary">
                <Icon className="size-6 text-primary" strokeWidth={1.5} />
              </span>
              <span className="max-w-16 truncate text-xs">{c.name}</span>
            </button>
          );
        })}
        {categories && categories.length > 5 && (
          <button type="button" onClick={() => router.push("/explore")} className="flex shrink-0 flex-col items-center gap-2">
            <span className="grid size-16 place-items-center rounded-full bg-secondary">
              <Store className="size-6 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <span className="text-xs">More</span>
          </button>
        )}
      </div>
    </main>
  );
}
