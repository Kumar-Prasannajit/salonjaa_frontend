"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Plus } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { Booking } from "@/lib/types";
import { SalonBookingCard } from "@/components/owner/salon-booking-card";
import { ReasonDialog } from "@/components/reason-dialog";
import { RespondToRescheduleDialog } from "@/components/respond-to-reschedule-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// GET /salon-bookings?status= — booking.validator.ts's salonBookingsQuerySchema
// accepts PENDING|AWAITING_PAYMENT|APPROVED|CANCELLED|COMPLETED (Module 14b
// added AWAITING_PAYMENT; no REJECTED/EXPIRED filter value exists), so those
// two statuses fold into the Cancelled tab client-side — same technique
// app/(tabs)/bookings/page.tsx already uses for its own tabs.
const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "AWAITING_PAYMENT", label: "Awaiting Payment" },
  { key: "APPROVED", label: "Approved" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function OwnerBookingsPage() {
  const router = useRouter();
  const toast = useToastContext();
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<Booking | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [dialogError, setDialogError] = useState("");

  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  const load = async (status: TabKey) => {
    setError("");
    setBookings(null);
    try {
      const result = await apiFetch<{ data: Booking[] }>(`/salon-bookings?status=${status}`);
      setBookings(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load(tab);
  }, [tab]);

  const approve = async (notes: string) => {
    if (!approveTarget) return;
    setBusyId(approveTarget.id);
    setDialogError("");
    try {
      await apiFetch(`/salon-bookings/${approveTarget.id}/approve`, { method: "POST", body: JSON.stringify({ notes: notes || undefined }) });
      setApproveTarget(null);
      toast.success("Booking approved.");
      await load(tab);
    } catch (e) {
      const msg = messageFromError(e);
      setDialogError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (reason: string) => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    setDialogError("");
    try {
      await apiFetch(`/salon-bookings/${rejectTarget.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      setRejectTarget(null);
      toast.success("Booking rejected.");
      await load(tab);
    } catch (e) {
      const msg = messageFromError(e);
      setDialogError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const acceptReschedule = async () => {
    if (!rescheduleTarget) return;
    setRescheduleBusy(true);
    setRescheduleError("");
    try {
      await apiFetch(`/bookings/${rescheduleTarget.id}/approve-reschedule`, { method: "POST" });
      setRescheduleTarget(null);
      toast.success("Reschedule accepted.");
      await load(tab);
    } catch (e) {
      const msg = messageFromError(e);
      setRescheduleError(msg);
      toast.error(msg);
    } finally {
      setRescheduleBusy(false);
    }
  };

  const declineReschedule = async (reason: string) => {
    if (!rescheduleTarget) return;
    setRescheduleBusy(true);
    setRescheduleError("");
    try {
      const body: Record<string, string> = {};
      if (reason) body.reason = reason;
      await apiFetch(`/bookings/${rescheduleTarget.id}/reject-reschedule`, { method: "POST", body: JSON.stringify(body) });
      setRescheduleTarget(null);
      toast.success("Reschedule declined.");
      await load(tab);
    } catch (e) {
      const msg = messageFromError(e);
      setRescheduleError(msg);
      toast.error(msg);
    } finally {
      setRescheduleBusy(false);
    }
  };

  // Module 16 — POST /salon-bookings/:id/no-show, {} body. Records a
  // customer strike automatically; window.confirm rather than a dialog,
  // same simple-destructive-confirm pattern as service-manager.tsx's remove().
  const markNoShow = async (booking: Booking) => {
    if (!window.confirm(`Mark ${booking.bookingNumber} as a no-show? This records a strike against the customer.`)) return;
    setBusyId(booking.id);
    try {
      await apiFetch(`/salon-bookings/${booking.id}/no-show`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Booking marked as no-show.");
      await load(tab);
    } catch (e) {
      toast.error(messageFromError(e));
    } finally {
      setBusyId(null);
    }
  };

  // BUG-007 fix — POST /salon-bookings/:id/complete, {} body. Same
  // window.confirm pattern as markNoShow above.
  const markComplete = async (booking: Booking) => {
    if (!window.confirm(`Mark ${booking.bookingNumber} as complete?`)) return;
    setBusyId(booking.id);
    try {
      await apiFetch(`/salon-bookings/${booking.id}/complete`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Booking marked complete.");
      await load(tab);
    } catch (e) {
      toast.error(messageFromError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-lg font-semibold md:text-2xl">Bookings</h1>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/owner/bookings/walk-in")}>
          <Plus className="size-4" />
          Walk-in
        </Button>
      </div>

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

      <div className="mt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && bookings === null && (
          <>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </>
        )}

        {bookings !== null && bookings.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <CalendarOff className="size-8 text-accent" />
            <p className="font-semibold">No {TABS.find((t) => t.key === tab)?.label.toLowerCase()} bookings</p>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {bookings?.map((b) => (
            <SalonBookingCard
              key={b.id}
              booking={b}
              busy={busyId === b.id}
              onApprove={setApproveTarget}
              onReject={setRejectTarget}
              onRespondToReschedule={setRescheduleTarget}
              onNoShow={markNoShow}
              onComplete={markComplete}
            />
          ))}
        </div>
      </div>

      <ReasonDialog
        open={!!approveTarget}
        title="Approve this booking?"
        description={approveTarget ? `${approveTarget.bookingNumber} — ${new Date(approveTarget.scheduledStart).toLocaleString()}` : undefined}
        label="Notes (optional)"
        required={false}
        confirmLabel="Approve"
        busy={!!busyId}
        error={dialogError}
        onConfirm={approve}
        onClose={() => {
          setApproveTarget(null);
          setDialogError("");
        }}
      />

      <ReasonDialog
        open={!!rejectTarget}
        title="Reject this booking?"
        description={rejectTarget ? `${rejectTarget.bookingNumber} — ${new Date(rejectTarget.scheduledStart).toLocaleString()}` : undefined}
        label="Reason"
        confirmLabel="Reject booking"
        destructive
        busy={!!busyId}
        error={dialogError}
        onConfirm={reject}
        onClose={() => {
          setRejectTarget(null);
          setDialogError("");
        }}
      />

      <RespondToRescheduleDialog
        booking={rescheduleTarget}
        busy={rescheduleBusy}
        error={rescheduleError}
        onAccept={acceptReschedule}
        onDecline={declineReschedule}
        onClose={() => {
          setRescheduleTarget(null);
          setRescheduleError("");
        }}
      />
    </main>
  );
}
