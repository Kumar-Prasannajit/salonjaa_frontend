"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { SalonAnalytics } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

function isoDateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const STAT_LABELS: { key: keyof Pick<SalonAnalytics, "totalBookings" | "completedBookings" | "cancelledBookings" | "noShowBookings" | "totalRevenue">; label: string; money?: boolean }[] = [
  { key: "totalBookings", label: "Bookings" },
  { key: "completedBookings", label: "Completed" },
  { key: "cancelledBookings", label: "Cancelled" },
  { key: "noShowBookings", label: "No-shows" },
  { key: "totalRevenue", label: "Revenue", money: true },
];

// GET /salons/:salonId/analytics?from&to (Module 17, owner-scoped) — plain
// stat-card grid, no charts/time-series, same "deliberately minimal"
// philosophy as Admin's platform-wide reports overview. averageRating and
// reviewCount are always the live current values regardless of the
// from/to range picked below; the rest are scoped to it.
export function SalonAnalyticsCard({ salonId }: { salonId: string }) {
  const [from, setFrom] = useState(isoDateNDaysAgo(30));
  const [to, setTo] = useState(isoDateNDaysAgo(0));
  const [data, setData] = useState<SalonAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setData(null);
    apiFetch<{ data: SalonAnalytics }>(`/salons/${salonId}/analytics?from=${from}&to=${to}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(messageFromError(e)));
  }, [salonId, from, to]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-primary" />
        <h2 className="font-serif font-semibold">Analytics</h2>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="analytics-from">From</Label>
          <Input id="analytics-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="analytics-to">To</Label>
          <Input id="analytics-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !data && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {data && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STAT_LABELS.map(({ key, label, money }) => (
            <div key={key} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{money ? `₹${data[key]}` : data[key]}</p>
            </div>
          ))}
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Avg. Rating</p>
            <p className="text-lg font-semibold">{data.averageRating != null ? data.averageRating.toFixed(1) : "—"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Reviews</p>
            <p className="text-lg font-semibold">{data.reviewCount}</p>
          </div>
        </div>
      )}

      {data && data.topServices.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Services</p>
          <div className="mt-2 space-y-1.5">
            {data.topServices.map((s) => (
              <div key={s.serviceId} className="flex justify-between text-sm">
                <span>{s.serviceName}</span>
                <span className="text-muted-foreground">{s.bookingCount} bookings</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
