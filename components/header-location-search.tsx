"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Search } from "lucide-react";
import { useGeolocationContext } from "@/hooks/geolocation-context";
import { Input } from "@/components/ui/input";

// Desktop-only header controls (hidden below md — DesktopNav's own
// breakpoint), matching how Urban Company/e-commerce sites keep location +
// search persistently in the nav bar rather than buried inside just the Home
// page body. Shares geo state with the Home page via GeolocationProvider so
// there's one permission prompt, not two independent ones.
export function HeaderLocationSearch() {
  const router = useRouter();
  const geo = useGeolocationContext();
  const [query, setQuery] = useState("");

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : "/explore");
  };

  return (
    <div className="hidden flex-1 items-center justify-center gap-3 md:flex">
      <button
        type="button"
        onClick={geo.request}
        disabled={geo.status === "loading"}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      >
        <LocateFixed className="size-3.5 text-primary" />
        {geo.status === "granted"
          ? "Sorted by distance"
          : geo.status === "loading"
            ? "Locating…"
            : geo.status === "denied" || geo.status === "unavailable"
              ? "Location unavailable"
              : "Use my location"}
      </button>
      <form onSubmit={submitSearch} className="relative w-56 xl:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for salons, services…"
          className="h-9 rounded-full pl-8 text-sm"
        />
      </form>
    </div>
  );
}
