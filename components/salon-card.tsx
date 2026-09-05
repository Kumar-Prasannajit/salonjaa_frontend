"use client";

import { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Star, Store } from "lucide-react";
import type { PublicBranchSummary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// One GET /public/branches row (docs/designs/02 "Popular Near You" and
// docs/designs/04 "Nearby Salons"). No discount badge, no heart/favourite
// icon — both explicitly out of scope per
// docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md (no source of truth for either),
// omitted rather than faked. `distanceKm` only renders when the caller
// actually supplied lat/lng (see hooks/use-geolocation.ts) — never guessed.
function CoverImage({ branch, className }: { branch: PublicBranchSummary; className: string }) {
  return branch.coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote, salon-owner-supplied URLs; no next.config.js domain allowlist exists for these yet.
    <img src={branch.coverImage} alt="" className={`object-cover ${className}`} />
  ) : (
    <div className={`grid place-items-center bg-secondary ${className}`}>
      <Store className="size-6 text-muted-foreground" strokeWidth={1.5} />
    </div>
  );
}

function RatingLine({ branch }: { branch: PublicBranchSummary }) {
  // averageRating is null (not 0) for a branch with zero reviews — GET
  // /public/branches's own repository only ever aggregates over rows that
  // exist, per public-branch.repository.ts's getRatingAggregates().
  if (branch.averageRating === null) return <p className="text-sm text-muted-foreground">No reviews yet</p>;
  return (
    <p className="flex items-center gap-1 text-sm">
      <Star className="size-3.5 fill-primary text-primary" />
      <span className="font-medium">{branch.averageRating.toFixed(1)}</span>
      <span className="text-muted-foreground">({branch.reviewCount})</span>
    </p>
  );
}

export function SalonCard({ branch, variant }: { branch: PublicBranchSummary; variant: "grid" | "row" }) {
  const router = useRouter();
  const title = branch.branchName && branch.branchName !== branch.salonName ? `${branch.salonName} · ${branch.branchName}` : branch.salonName;
  const goToDetails = () => router.push(`/salons/${branch.branchId}`);
  const goToServices = (e: MouseEvent) => {
    e.stopPropagation();
    router.push(`/salons/${branch.branchId}/services`);
  };

  if (variant === "row") {
    return (
      <Card onClick={goToDetails} className="cursor-pointer flex-row items-center gap-3 p-3">
        <CoverImage branch={branch} className="size-20 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {branch.city}
            {branch.distanceKm != null && `, ${branch.distanceKm.toFixed(1)} km`}
          </p>
          <RatingLine branch={branch} />
        </div>
        <Button size="sm" className="shrink-0 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={goToServices}>
          Book
        </Button>
      </Card>
    );
  }

  return (
    <Card onClick={goToDetails} className="w-44 shrink-0 cursor-pointer gap-0 overflow-hidden p-0">
      <CoverImage branch={branch} className="h-28 w-full" />
      <div className="space-y-1 p-3">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {branch.addressLine1 || branch.city}
          {branch.distanceKm != null && `, ${branch.distanceKm.toFixed(1)} km`}
        </p>
        <RatingLine branch={branch} />
      </div>
    </Card>
  );
}
