"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { Salon, SalonListItem } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VERIFICATION_VARIANT: Record<Salon["verificationStatus"], "default" | "destructive" | "outline"> = {
  PENDING: "outline",
  VERIFIED: "default",
  REJECTED: "destructive",
};

// GET /salons -> bare [{ id, name }] only (frontend_handover.md's own documented
// shape) — verificationStatus, which the task asks to "show prominently," only
// exists on GET /salons/:salonId, so each row's detail is fetched too. Owner
// salon counts are expected to be tiny (dev/test scale), so N+1 detail calls
// here are the pragmatic choice over a second bespoke list endpoint.
export default function OwnerSalonsPage() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[] | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const list = await apiFetch<SalonListItem[]>("/salons");
      const detailed = await Promise.all(
        list.map((s) => apiFetch<{ data: Salon }>(`/salons/${s.id}`).then((r) => r.data))
      );
      setSalons(detailed);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Your Salons</h1>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/owner/salons/new")}>
          <Plus className="size-4" />
          New Salon
        </Button>
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

        {salons !== null && salons.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Building2 className="size-8 text-accent" />
            <p className="font-semibold">No salons yet</p>
            <p className="text-sm text-muted-foreground">Register your first salon — it stays pending Admin review until verified.</p>
          </Card>
        )}

        {salons?.map((s) => (
          <Card key={s.id} className="cursor-pointer gap-1 p-4 transition-colors hover:bg-accent/40" onClick={() => router.push(`/owner/salons/${s.id}`)}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{s.name}</p>
              <Badge variant={VERIFICATION_VARIANT[s.verificationStatus]}>{s.verificationStatus}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Status: {s.status}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
