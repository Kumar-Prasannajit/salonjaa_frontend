"use client";

import { useRouter } from "next/navigation";
import type { PublicBranchSummary } from "@/lib/types";
import { SalonCard } from "@/components/salon-card";

// Shared "titled horizontal row of salon cards + See all" section, used for
// the gender-targeted Home sections (Salon for Women/Men/Kids) below
// "Popular near you". Renders nothing for an empty list rather than an empty
// section header — e.g. Salon for Kids simply doesn't show up on a city with
// no KIDS-serving branches yet, instead of an awkward "nothing here" block.
export function SalonSectionRow({
  title,
  subtitle,
  salons,
  seeAllHref,
}: {
  title: string;
  subtitle?: string;
  salons: PublicBranchSummary[];
  seeAllHref: string;
}) {
  const router = useRouter();
  if (salons.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold md:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <button type="button" onClick={() => router.push(seeAllHref)} className="shrink-0 text-sm font-medium text-primary">
          See all
        </button>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {salons.slice(0, 8).map((b) => (
          <SalonCard key={b.branchId} branch={b} variant="grid" />
        ))}
      </div>
    </div>
  );
}
