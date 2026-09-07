"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Lock } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { Booking, BookingDetail, Payment } from "@/lib/types";
import { useAccountContext } from "@/hooks/account-context";
import { useToastContext } from "@/hooks/toast-context";
import { BookingCard } from "@/components/booking-card";
import { CancelBookingDialog } from "@/components/cancel-booking-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// docs/designs/12-user-bookings.jpeg. GET /bookings/my-bookings takes a
// single optional status filter, but the design's 3 tabs need PENDING+APPROVED
// merged into "Upcoming" — fetched once, unfiltered (no pagination is
// documented for this endpoint either, same precedent as Reviews), then
// bucketed client-side. EXPIRED bookings (the booking-expiry worker's
// terminal state, PROGRESS.md's Module 6) are folded into "Cancelled" —
// closest end-state in spirit, there's no 4th tab in the design for it.
export default function BookingsPage() {
  const account = useAccountContext();
  const router = useRouter();
  const toast = useToastContext();

  const [tab, setTab] = useState<TabKey>("upcoming");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<Record<string, BookingDetail>>({});
  const requestedDetailIds = useRef(new Set<string>());
  const [paidBookingIds, setPaidBookingIds] = useState<Set<string>>(new Set());

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const loadBookings = async () => {
    setError("");
    try {
      const [bookingsResult, paymentsResult] = await Promise.all([
        apiFetch<{ data: Booking[] }>("/bookings/my-bookings"),
        // Needed only so an already-paid APPROVED booking stops offering "Pay
        // Now" — bookingStatus alone never changes on successful payment.
        apiFetch<{ data: Payment[] }>("/payments/my-payments"),
      ]);
      setBookings(bookingsResult.data);
      setPaidBookingIds(new Set(paymentsResult.data.filter((p) => p.status === "SUCCESS").map((p) => p.bookingId)));
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    if (account.isAuthenticated) loadBookings();
  }, [account.isAuthenticated]);

  const buckets = useMemo(() => {
    const list = bookings || [];
    return {
      upcoming: list
        .filter((b) => b.bookingStatus === "PENDING" || b.bookingStatus === "AWAITING_PAYMENT" || b.bookingStatus === "APPROVED")
        .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
      completed: list.filter((b) => b.bookingStatus === "COMPLETED").sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart)),
      cancelled: list
        .filter((b) => b.bookingStatus === "CANCELLED" || b.bookingStatus === "EXPIRED")
        .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart)),
    };
  }, [bookings]);

  const activeList = buckets[tab];

  useEffect(() => {
    const toFetch = activeList.filter((b) => !requestedDetailIds.current.has(b.id));
    if (!toFetch.length) return;
    toFetch.forEach((b) => requestedDetailIds.current.add(b.id));
    toFetch.forEach((b) => {
      apiFetch<{ booking: BookingDetail }>(`/bookings/${b.id}`)
        .then((result) => setDetails((prev) => ({ ...prev, [b.id]: result.booking })))
        .catch(() => {
          // A failed detail fetch just leaves that card's services skeleton
          // showing — the list view (status/date/total) already rendered
          // from real data, so this isn't fatal to the page.
          requestedDetailIds.current.delete(b.id);
        });
    });
  }, [activeList]);

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    setCancelError("");
    try {
      await apiFetch(`/bookings/${cancelTarget.id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });
      setCancelTarget(null);
      toast.success("Booking cancelled.");
      await loadBookings();
    } catch (e) {
      const msg = messageFromError(e);
      setCancelError(msg);
      toast.error(msg);
    } finally {
      setCancelBusy(false);
    }
  };

  if (!account.isAuthenticated) {
    return (
      <main className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <Card className="flex size-16 items-center justify-center rounded-2xl border-primary/40 bg-card/60">
          <Lock className="size-7 text-primary" strokeWidth={1.5} />
        </Card>
        <h1 className="text-xl font-semibold">Sign in to view your bookings</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Your appointments and their status live here once you&apos;re signed in.</p>
        <Button className="bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/profile")}>
          Go to Profile to sign in
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <h1 className="text-lg font-semibold md:text-2xl">My Bookings</h1>

      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-gradient-to-r from-gold to-gold-bright text-primary-foreground" : "border border-border text-muted-foreground"
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

        {bookings !== null && activeList.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <CalendarOff className="size-8 text-accent" />
            <p className="font-semibold">No {tab} bookings</p>
            <p className="text-sm text-muted-foreground">
              {tab === "upcoming" ? "Book an appointment to see it here." : "Nothing in this category yet."}
            </p>
          </Card>
        )}

        {activeList.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            detail={details[b.id]}
            paid={paidBookingIds.has(b.id)}
            onCancel={setCancelTarget}
            cancelling={cancelBusy && cancelTarget?.id === b.id}
          />
        ))}
      </div>

      <CancelBookingDialog
        booking={cancelTarget}
        busy={cancelBusy}
        error={cancelError}
        onConfirm={confirmCancel}
        onClose={() => {
          setCancelTarget(null);
          setCancelError("");
        }}
      />
    </main>
  );
}
