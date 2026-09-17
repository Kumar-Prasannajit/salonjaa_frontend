"use client";

import { useEffect, useState } from "react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { toISODate } from "@/lib/utils";
import type { AdminReportOverview } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// GET /admin/reports/overview?from&to — "flow" metrics (bookings/revenue) are
// scoped to the date range; "stock" metrics (salon counts, open queues) are
// always the current live count regardless of range (PROGRESS.md's Module 9d
// note) — labeled accordingly rather than implying all 9 share one meaning.
const FLOW_STATS: { key: keyof AdminReportOverview; label: string; money?: boolean }[] = [
  { key: "totalBookings", label: "Total Bookings" },
  { key: "completedBookings", label: "Completed Bookings" },
  { key: "cancelledBookings", label: "Cancelled Bookings" },
  { key: "totalRevenue", label: "Total Revenue", money: true },
];

const STOCK_STATS: { key: keyof AdminReportOverview; label: string }[] = [
  { key: "totalSalons", label: "Total Salons" },
  { key: "verifiedSalons", label: "Verified Salons" },
  { key: "pendingSalons", label: "Pending Salons" },
  { key: "openComplaints", label: "Open Complaints" },
  { key: "pendingRefunds", label: "Pending Refunds" },
];

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return { from: toISODate(from), to: toISODate(to) };
}

export default function AdminReportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [overview, setOverview] = useState<AdminReportOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setOverview(null);
    apiFetch<{ data: AdminReportOverview }>(`/admin/reports/overview?from=${range.from}&to=${range.to}`)
      .then((r) => setOverview(r.data))
      .catch((e) => setError(messageFromError(e)));
  }, [range]);

  return (
    <main>
      <h1 className="font-serif text-lg font-semibold md:text-2xl">Reports Overview</h1>

      <Card className="mt-4 flex flex-row flex-wrap items-end gap-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="report-from">From</Label>
          <Input id="report-from" type="date" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-to">To</Label>
          <Input id="report-to" type="date" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !overview && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {overview && (
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">In range</p>
            <div className="grid grid-cols-2 gap-3">
              {FLOW_STATS.map((s) => (
                <Card key={s.key} className="gap-1 p-4">
                  <p className="text-2xl font-bold">{s.money ? `₹${overview[s.key]}` : overview[s.key]}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Right now</p>
            <div className="grid grid-cols-2 gap-3">
              {STOCK_STATS.map((s) => (
                <Card key={s.key} className="gap-1 p-4">
                  <p className="text-2xl font-bold">{overview[s.key]}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
