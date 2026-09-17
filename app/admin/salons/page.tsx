"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { AdminSalon } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "VERIFIED", label: "Verified" },
  { key: "REJECTED", label: "Rejected" },
] as const;

const VARIANT: Record<AdminSalon["verificationStatus"], "default" | "destructive" | "outline"> = {
  PENDING: "outline",
  VERIFIED: "default",
  REJECTED: "destructive",
};

// GET /admin/salons?status= — the queue every salon sits in before it's
// publicly visible/bookable (frontend_handover.md).
export default function AdminSalonsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("PENDING");
  const [salons, setSalons] = useState<AdminSalon[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setSalons(null);
    apiFetch<{ data: AdminSalon[] }>(`/admin/salons${tab ? `?status=${tab}` : ""}`)
      .then((r) => setSalons(r.data))
      .catch((e) => setError(messageFromError(e)));
  }, [tab]);

  return (
    <main>
      <h1 className="font-serif text-lg font-semibold md:text-2xl">Salon Approval Queue</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-gradient-to-r from-brass to-brass-bright text-primary-foreground" : "border border-border text-muted-foreground"
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

        {!error && salons === null && (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        )}

        {salons?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Building2 className="size-8 text-accent" />
            <p className="font-semibold">Nothing here</p>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {salons?.map((s) => (
            <Card key={s.id} className="cursor-pointer gap-1 p-4 transition-colors hover:bg-accent/40" onClick={() => router.push(`/admin/salons/${s.id}`)}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{s.name}</p>
                <Badge variant={VARIANT[s.verificationStatus]}>{s.verificationStatus}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{s.ownerProfile.businessName || "No business name on file"}</p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
