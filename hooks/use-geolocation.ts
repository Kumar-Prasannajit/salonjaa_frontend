"use client";

import { useCallback, useState } from "react";

// Real, device-provided coordinates for GET /public/branches's
// lat/lng+sort=distance — there's no geocoding endpoint anywhere to turn this
// (or a typed place name) into a "Hyderabad, Banjara Hills"-style label, so
// callers only ever get raw coordinates, never a fabricated location string.
// Nothing here is requested automatically; a caller must invoke request()
// (e.g. from a "Use my location" button), matching the anonymous-by-default
// browsing decision — a location prompt shouldn't fire unasked on page load.
export type GeolocationStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { status, coords, request };
}
