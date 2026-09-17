"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useGeolocation } from "@/hooks/use-geolocation";

// Same "hoist into a context" reasoning as hooks/account-context.tsx: the
// header's location control (app/(tabs)/layout.tsx, desktop) and the Home
// page's distance-sort both need the same request()/coords/status, not two
// independent permission prompts.
const GeolocationContext = createContext<ReturnType<typeof useGeolocation> | null>(null);

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation();
  return <GeolocationContext.Provider value={geo}>{children}</GeolocationContext.Provider>;
}

export function useGeolocationContext() {
  const ctx = useContext(GeolocationContext);
  if (!ctx) throw new Error("useGeolocationContext must be used within GeolocationProvider");
  return ctx;
}
