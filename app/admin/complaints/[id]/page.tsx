"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { useToastContext } from "@/hooks/toast-context";
import type { AdminComplaint } from "@/lib/types";
import { ReasonDialog } from "@/components/reason-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// GET /admin/complaints/:id (embeds filedBy always, linkedBooking/linkedPayment
// when applicable) + resolve (required resolutionNotes)/reject (required
// reason) — both only act on OPEN/IN_PROGRESS.
export default function AdminComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [complaint, setComplaint] = useState<AdminComplaint | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"resolve" | "reject" | null>(null);
  const [dialogError, setDialogError] = useState("");

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: AdminComplaint }>(`/admin/complaints/${id}`);
      setComplaint(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const decide = async (path: "resolve" | "reject", body: Record<string, string>) => {
    setBusy(true);
    setDialogError("");
    try {
      const result = await apiFetch<{ data: AdminComplaint }>(`/admin/complaints/${id}/${path}`, { method: "POST", body: JSON.stringify(body) });
      setComplaint(result.data);
      setDialog(null);
      toast.success(path === "resolve" ? "Complaint resolved." : "Complaint rejected.");
    } catch (e) {
      const msg = messageFromError(e);
      setDialogError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const actionable = complaint?.status === "OPEN" || complaint?.status === "IN_PROGRESS";

  return (
    <main>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/admin/complaints")} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="font-serif text-lg font-semibold md:text-2xl">Complaint Detail</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !complaint && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {complaint && (
        <div className="mt-6 max-w-3xl space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{complaint.type}</p>
              <Badge variant="outline">{complaint.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{complaint.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">Filed {formatDateTime(complaint.createdAt)}</p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5 text-sm">
              <p className="font-medium">Filed by</p>
              <p className="mt-1 text-muted-foreground">{complaint.filedBy.fullName || "No name on file"}</p>
              <p className="text-muted-foreground">{complaint.filedBy.email}</p>
            </Card>

            {complaint.linkedBooking && (
              <Card className="p-5 text-sm">
                <p className="font-medium">Linked booking</p>
                <p className="mt-1 text-muted-foreground">
                  {complaint.linkedBooking.bookingNumber} • {complaint.linkedBooking.bookingStatus}
                </p>
              </Card>
            )}

            {complaint.linkedPayment && (
              <Card className="p-5 text-sm">
                <p className="font-medium">Linked payment</p>
                <p className="mt-1 text-muted-foreground">
                  ₹{complaint.linkedPayment.amount} • {complaint.linkedPayment.status}
                </p>
              </Card>
            )}
          </div>

          {!complaint.linkedBooking && !complaint.linkedPayment && complaint.referenceId && (
            <p className="text-xs text-muted-foreground">Reference: {complaint.referenceId}</p>
          )}

          {complaint.resolutionNotes && (
            <Alert>
              <AlertDescription>Resolution notes: {complaint.resolutionNotes}</AlertDescription>
            </Alert>
          )}

          {actionable && (
            <div className="flex gap-2">
              <Button disabled={busy} className="flex-1 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => setDialog("resolve")}>
                Resolve
              </Button>
              <Button disabled={busy} variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => setDialog("reject")}>
                Reject
              </Button>
            </div>
          )}
        </div>
      )}

      <ReasonDialog
        open={dialog === "resolve"}
        title="Resolve this complaint?"
        label="Resolution notes"
        confirmLabel="Resolve"
        busy={busy}
        error={dialogError}
        onConfirm={(resolutionNotes) => decide("resolve", { resolutionNotes })}
        onClose={() => {
          setDialog(null);
          setDialogError("");
        }}
      />
      <ReasonDialog
        open={dialog === "reject"}
        title="Reject this complaint?"
        label="Reason"
        confirmLabel="Reject"
        destructive
        busy={busy}
        error={dialogError}
        onConfirm={(reason) => decide("reject", { reason })}
        onClose={() => {
          setDialog(null);
          setDialogError("");
        }}
      />
    </main>
  );
}
