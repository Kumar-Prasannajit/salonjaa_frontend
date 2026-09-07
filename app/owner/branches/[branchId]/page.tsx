"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { Branch } from "@/lib/types";
import { BranchInfoCard } from "@/components/owner/branch-info-card";
import { BranchHolidaysCard } from "@/components/owner/branch-holidays-card";
import { BranchCapacityCard } from "@/components/owner/branch-capacity-card";
import { StaffManager } from "@/components/owner/staff-manager";
import { ServiceManager } from "@/components/owner/service-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// One workspace page for everything scoped to a branch — info, holidays,
// capacity, staff, services — rather than 5 separate routes, since branchId
// is the one filter every one of those endpoints needs and an owner working
// on a branch naturally wants all of it in one place.
export default function OwnerBranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();

  const [branch, setBranch] = useState<Branch | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setBranch(null);
    apiFetch<{ data: Branch }>(`/branches/${branchId}`)
      .then((r) => setBranch(r.data))
      .catch((e) => setError(messageFromError(e)));
  }, [branchId]);

  return (
    <main>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (branch ? router.push(`/owner/salons/${branch.salonId}`) : router.back())}
          aria-label="Back"
          className="rounded-full border border-border p-2"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 truncate text-lg font-semibold md:text-2xl">{branch?.name || "Branch"}</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !branch && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {branch && (
        <div className="mt-6 space-y-6">
          <BranchInfoCard branch={branch} onUpdated={setBranch} />
          <BranchHolidaysCard branchId={branch.id} />
          <BranchCapacityCard branchId={branch.id} />
          <StaffManager branchId={branch.id} />
          <ServiceManager branchId={branch.id} />
        </div>
      )}
    </main>
  );
}
