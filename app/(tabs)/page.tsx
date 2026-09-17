"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Brush, Flower2, Hand, LocateFixed, Palette, Scissors, Search, SlidersHorizontal, Sparkles, Spool, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { PublicBranchSummary, PublicPromotion, ServiceCategory } from "@/lib/types";
import { useAccountContext } from "@/hooks/account-context";
import { useGeolocationContext } from "@/hooks/geolocation-context";
import { SalonCard } from "@/components/salon-card";
import { SalonSectionRow } from "@/components/salon-section-row";
import { PromoBannerCarousel } from "@/components/promo-banner-carousel";
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

// Hardcoded per the user's call — these are fixed, curated photos for the
// 8 known starter categories (src/db/seed/index.ts's STARTER_CATEGORIES on
// the backend), not a dynamic owner/admin-editable field. Keyed by the same
// semantic `icon` string as CATEGORY_ICONS above. A category whose icon
// isn't in this map (a new one added server-side) just falls back to the
// Lucide icon circle instead of a broken image.
const CATEGORY_IMAGES: Record<string, string> = {
  scissors: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200&q=70",
  razor: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&q=70",
  palette: "https://images.unsplash.com/photo-1470259078422-826894b933aa?w=200&q=70",
  spa: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=200&q=70",
  sparkles: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200&q=70",
  hand: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&q=70",
  thread: "https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=200&q=70",
  makeup: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=200&q=70",
};

function categoryImage(icon: string | null): string | null {
  return (icon && CATEGORY_IMAGES[icon.trim().toLowerCase()]) || null;
}

// The naive `hour < 12 ? "Morning" : …` version called 12:30am "Morning" —
// late night/early morning needs its own bucket instead of falling into
// whichever neighbor happens to own hour 0.
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export default function HomePage() {
  const router = useRouter();
  const account = useAccountContext();
  const geo = useGeolocationContext();

  const [query, setQuery] = useState("");
  const [branches, setBranches] = useState<PublicBranchSummary[] | null>(null);
  const [branchesError, setBranchesError] = useState("");
  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);

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

  // No branchId = every currently-active, in-range promotion site-wide
  // (promotion.repository.ts's listActive), for the homepage banner strip —
  // not scoped to one salon like the detail page's own promotions fetch.
  useEffect(() => {
    apiFetch<{ data: PublicPromotion[] }>("/public/promotions", {}, { auth: false })
      .then((result) => setPromotions(result.data))
      .catch(() => {
        // Non-fatal — the rest of Home already loaded fine; the banner
        // section just stays empty (PromoBannerCarousel renders nothing).
      });
  }, []);

  // Client-side split of the same "Popular near you" list — no genderServed
  // filter exists on GET /public/branches (frontend_handover.md), so this
  // reuses the one fetch rather than four separate backend calls. A UNISEX
  // branch genuinely serves everyone, so it's included in both Women's and
  // Men's rows — KIDS is its own dedicated audience, not folded into either.
  const womenSalons = (branches || []).filter((b) => b.genderServed === "WOMEN" || b.genderServed === "UNISEX");
  const menSalons = (branches || []).filter((b) => b.genderServed === "MEN" || b.genderServed === "UNISEX");
  const kidsSalons = (branches || []).filter((b) => b.genderServed === "KIDS");

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : "/explore");
  };

  return (
    <main className="px-5 py-6 md:px-10 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Good {greeting()},</p>
          <p className="font-serif text-2xl font-semibold md:text-3xl">Looking good, as always.</p>
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
        className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground disabled:opacity-60 md:hidden"
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

      <form onSubmit={submitSearch} className="mt-4 flex gap-2 md:hidden">
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

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold md:text-2xl">Popular near you</h2>
        <button type="button" onClick={() => router.push("/explore")} className="text-sm font-medium text-primary">
          See all
        </button>
      </div>

      <div className="mt-4">
        {branchesError && (
          <Alert variant="destructive">
            <AlertDescription>{branchesError}</AlertDescription>
          </Alert>
        )}
        {!branchesError && branches === null && (
          <div className="flex gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
            <Skeleton className="h-44 w-44 shrink-0 rounded-xl sm:h-64 sm:w-full" />
            <Skeleton className="h-44 w-44 shrink-0 rounded-xl sm:h-64 sm:w-full" />
          </div>
        )}
        {branches !== null && branches.length === 0 && <p className="text-sm text-muted-foreground">No salons found near you yet.</p>}
        {branches !== null && branches.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {branches.slice(0, 8).map((b) => (
              <SalonCard key={b.branchId} branch={b} variant="grid" />
            ))}
          </div>
        )}
      </div>

      <PromoBannerCarousel promotions={promotions} />

      <SalonSectionRow title="Salon for Women" subtitle="Pamper yourself at home or in-studio" salons={womenSalons} seeAllHref="/explore?gender=WOMEN" />
      <SalonSectionRow title="Salon for Men" subtitle="Grooming, styling, and quick refreshes" salons={menSalons} seeAllHref="/explore?gender=MEN" />
      <SalonSectionRow title="Salon for Kids" subtitle="Patient, playful stylists for little ones" salons={kidsSalons} seeAllHref="/explore?gender=KIDS" />

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold md:text-2xl">Top services</h2>
        <button type="button" onClick={() => router.push("/explore")} className="text-sm font-medium text-primary">
          See all
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-5 overflow-x-auto pb-1 sm:flex-wrap">
        {categories === null && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="size-24 shrink-0 rounded-full" />)}
        {categories?.slice(0, 5).map((c) => {
          const image = categoryImage(c.icon);
          const Icon = categoryIcon(c.icon);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => router.push(`/explore?serviceCategoryId=${c.id}`)}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <span className="grid size-24 place-items-center overflow-hidden rounded-full bg-secondary">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- fixed, hardcoded curated photo, not a remote/owner-supplied field.
                  <img src={image} alt="" className="size-full object-cover" />
                ) : (
                  <Icon className="size-7 text-primary" strokeWidth={1.5} />
                )}
              </span>
              <span className="max-w-20 truncate text-xs">{c.name}</span>
            </button>
          );
        })}
        {categories && categories.length > 5 && (
          <button type="button" onClick={() => router.push("/explore")} className="flex shrink-0 flex-col items-center gap-2">
            <span className="grid size-24 place-items-center rounded-full bg-secondary">
              <Store className="size-7 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <span className="text-xs">More</span>
          </button>
        )}
      </div>
    </main>
  );
}
