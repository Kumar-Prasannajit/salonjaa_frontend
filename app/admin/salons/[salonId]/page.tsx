"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { AdminSalon } from "@/lib/types";
import { ReasonDialog } from "@/components/reason-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VARIANT: Record<AdminSalon["verificationStatus"], "default" | "destructive" | "outline"> = {
  PENDING: "outline",
  VERIFIED: "default",
  REJECTED: "destructive",
};

// GET /admin/salons/:salonId + verify/reject/suspend/reactivate. Reject and
// suspend both require a `reason` body field (frontend_handover.md); verify
// and reactivate take none.
export default function AdminSalonDetailPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [salon, setSalon] = useState<AdminSalon | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null);
  const [dialogError, setDialogError] = useState("");

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: AdminSalon }>(`/admin/salons/${salonId}`);
      setSalon(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  const act = async (path: string, label: string, body?: Record<string, string>) => {
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ data: AdminSalon }>(`/admin/salons/${salonId}/${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      setSalon(result.data);
      setDialog(null);
      toast.success(label);
    } catch (e) {
      const msg = messageFromError(e);
      if (dialog) setDialogError(msg);
      else setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/admin/salons")} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 truncate font-serif text-lg font-semibold md:text-2xl">{salon?.name || "Salon"}</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !salon && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {salon && (
        <div className="mt-6 max-w-2xl space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Badge variant={VARIANT[salon.verificationStatus]}>{salon.verificationStatus}</Badge>
              <Badge variant="outline">{salon.status}</Badge>
            </div>
            {salon.description && <p className="mt-3 text-sm text-muted-foreground">{salon.description}</p>}
            {salon.verificationReason && <p className="mt-3 text-sm text-destructive">Reason on file: {salon.verificationReason}</p>}

            <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <p className="font-medium">Owner profile</p>
              <p className="text-muted-foreground">Business: {salon.ownerProfile.businessName || "—"}</p>
              <p className="text-muted-foreground">GST: {salon.ownerProfile.gstNumber || "—"}</p>
              <p className="text-muted-foreground">PAN: {salon.ownerProfile.panNumber || "—"}</p>
              <p className="text-muted-foreground">KYC: {salon.ownerProfile.kycStatus}</p>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            {salon.verificationStatus === "PENDING" && (
              <>
                <Button disabled={busy} className="flex-1 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => act("verify", "Salon verified.")}>
                  Verify
                </Button>
                <Button disabled={busy} variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => setDialog("reject")}>
                  Reject
                </Button>
              </>
            )}
            {salon.status === "ACTIVE" && (
              <Button disabled={busy} variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => setDialog("suspend")}>
                Suspend
              </Button>
            )}
            {salon.status === "SUSPENDED" && (
              <Button disabled={busy} className="flex-1 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => act("reactivate", "Salon reactivated.")}>
                Reactivate
              </Button>
            )}
          </div>
        </div>
      )}

      <ReasonDialog
        open={dialog === "reject"}
        title="Reject this salon?"
        label="Reason"
        confirmLabel="Reject"
        destructive
        busy={busy}
        error={dialogError}
        onConfirm={(reason) => act("reject", "Salon rejected.", { reason })}
        onClose={() => {
          setDialog(null);
          setDialogError("");
        }}
      />
      <ReasonDialog
        open={dialog === "suspend"}
        title="Suspend this salon?"
        description="This pulls an already-verified salon offline immediately."
        label="Reason"
        confirmLabel="Suspend"
        destructive
        busy={busy}
        error={dialogError}
        onConfirm={(reason) => act("suspend", "Salon suspended.", { reason })}
        onClose={() => {
          setDialog(null);
          setDialogError("");
        }}
      />
    </main>
  );
}
