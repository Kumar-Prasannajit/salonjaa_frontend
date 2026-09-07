"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import type { AdminRefund } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
] as const;

const VARIANT: Record<AdminRefund["status"], "default" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  PROCESSING: "outline",
  COMPLETED: "default",
  REJECTED: "destructive",
};

// GET /admin/refunds?status= — no automated eligibility check, every refund
// is read and decided by hand (PROGRESS.md's Module 9b note); "approve" here
// only marks the decision, no money actually moves (no gateway wired for it).
export default function AdminRefundsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("PENDING");
  const [refunds, setRefunds] = useState<AdminRefund[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setRefunds(null);
    apiFetch<{ data: AdminRefund[] }>(`/admin/refunds${tab ? `?status=${tab}` : ""}`)
      .then((r) => setRefunds(r.data))
      .catch((e) => setError(messageFromError(e)));
  }, [tab]);

  return (
    <main>
      <h1 className="text-lg font-semibold md:text-2xl">Refunds Queue</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-gradient-to-r from-gold to-gold-bright text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && refunds === null && (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        )}

        {refunds?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Receipt className="size-8 text-accent" />
            <p className="font-semibold">Nothing here</p>
          </Card>
        )}

        {refunds?.map((r) => (
          <Card key={r.id} className="cursor-pointer gap-1 p-4 transition-colors hover:bg-accent/40" onClick={() => router.push(`/admin/refunds/${r.id}`)}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{r.booking.bookingNumber}</p>
              <Badge variant={VARIANT[r.status]}>{r.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {r.customer?.fullName || r.customer?.email || "Unknown customer"} • ₹{r.amount} • {formatDateTime(r.createdAt)}
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}
