"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import type { AdminRefund } from "@/lib/types";
import { ReasonDialog } from "@/components/reason-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// GET /admin/refunds/:id (joined booking+payment+customer) + approve
// (optional notes)/reject (required reason) — both only act on PENDING.
export default function AdminRefundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [refund, setRefund] = useState<AdminRefund | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [dialogError, setDialogError] = useState("");

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: AdminRefund }>(`/admin/refunds/${id}`);
      setRefund(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const decide = async (path: "approve" | "reject", body: Record<string, string | undefined>) => {
    setBusy(true);
    setDialogError("");
    try {
      const result = await apiFetch<{ data: AdminRefund }>(`/admin/refunds/${id}/${path}`, { method: "POST", body: JSON.stringify(body) });
      setRefund(result.data);
      setDialog(null);
    } catch (e) {
      setDialogError(messageFromError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/admin/refunds")} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-lg font-semibold md:text-2xl">Refund Detail</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !refund && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {refund && (
        <div className="mt-6 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold">₹{refund.amount}</p>
              <Badge variant="outline">{refund.status}</Badge>
            </div>
            {refund.reason && <p className="mt-2 text-sm text-muted-foreground">Customer&apos;s reason: {refund.reason}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Requested {formatDateTime(refund.createdAt)}</p>
          </Card>

          <Card className="p-5 text-sm">
            <p className="font-medium">Booking</p>
            <p className="mt-1 text-muted-foreground">{refund.booking.bookingNumber} • {refund.booking.bookingStatus}</p>
            <p className="text-muted-foreground">{formatDateTime(refund.booking.scheduledStart)}</p>
            <p className="text-muted-foreground">Total: ₹{refund.booking.totalAmount}</p>
          </Card>

          <Card className="p-5 text-sm">
            <p className="font-medium">Payment</p>
            <p className="mt-1 text-muted-foreground">₹{refund.payment.amount} {refund.payment.currency} • {refund.payment.status}</p>
            {refund.payment.providerPaymentId && <p className="text-muted-foreground">Provider ID: {refund.payment.providerPaymentId}</p>}
            {refund.payment.paidAt && <p className="text-muted-foreground">Paid {formatDateTime(refund.payment.paidAt)}</p>}
          </Card>

          <Card className="p-5 text-sm">
            <p className="font-medium">Customer</p>
            <p className="mt-1 text-muted-foreground">{refund.customer?.fullName || "No name on file"}</p>
            <p className="text-muted-foreground">{refund.customer?.email || "—"}</p>
          </Card>

          {refund.status === "PENDING" && (
            <div className="flex gap-2">
              <Button disabled={busy} className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => setDialog("approve")}>
                Approve
              </Button>
              <Button disabled={busy} variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => setDialog("reject")}>
                Reject
              </Button>
            </div>
          )}
        </div>
      )}

      <ReasonDialog
        open={dialog === "approve"}
        title="Approve this refund?"
        description="This only marks the decision — no money moves automatically."
        label="Notes (optional)"
        required={false}
        confirmLabel="Approve"
        busy={busy}
        error={dialogError}
        onConfirm={(notes) => decide("approve", { notes: notes || undefined })}
        onClose={() => {
          setDialog(null);
          setDialogError("");
        }}
      />
      <ReasonDialog
        open={dialog === "reject"}
        title="Reject this refund?"
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
