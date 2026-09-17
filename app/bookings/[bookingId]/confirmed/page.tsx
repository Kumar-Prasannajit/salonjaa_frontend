"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { downloadBookingICS, formatDateTime } from "@/lib/utils";
import type { BookingDetail, Payment } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// docs/designs/10-booking-confirmed.jpeg — the real one this time: only
// reachable after POST /payments/verify actually succeeds (pay/page.tsx
// redirects here on success; this page independently re-checks via
// GET /payments/my-payments so landing here directly with no successful
// payment doesn't show a false "Confirmed").
export default function BookingConfirmedPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiFetch<{ booking: BookingDetail }>(`/bookings/${bookingId}`), apiFetch<{ data: Payment[] }>("/payments/my-payments")])
      .then(([bookingResult, paymentsResult]) => {
        setBooking(bookingResult.booking);
        const paid = paymentsResult.data.some((p) => p.bookingId === bookingId && p.status === "SUCCESS");
        setConfirmed(paid);
        if (!paid) router.replace(`/bookings/${bookingId}/pay`);
      })
      .catch((e) => setError(messageFromError(e)));
  }, [bookingId, router]);

  if (error) {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!booking || confirmed === null || !confirmed) {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md space-y-3 bg-background px-5 py-8 md:max-w-2xl">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 text-center md:max-w-2xl md:px-10 md:py-12 lg:max-w-2xl">
      <div className="flex flex-col items-center">
        <div className="grid size-16 place-items-center rounded-full border-2 border-primary/60">
          <CheckCircle2 className="size-9 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-primary">Booking confirmed</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">You&apos;re all set for some well-deserved pampering.</p>
      </div>

      <Card className="mt-6 divide-y divide-border p-0 text-left">
        <div className="space-y-1 p-4">
          {booking.services.map((s) => (
            <div key={s.serviceId} className="flex justify-between text-sm">
              <span>
                {s.serviceName}
                {s.variantName && <span className="text-muted-foreground"> — {s.variantName}</span>}
              </span>
              <span>₹{s.price}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between p-4 text-sm">
          <span className="text-muted-foreground">Date & Time</span>
          <span className="font-medium">{formatDateTime(booking.scheduledStart)}</span>
        </div>
        <div className="flex justify-between p-4 text-base font-semibold">
          <span>Total Paid</span>
          <span>₹{booking.totalAmount}</span>
        </div>
      </Card>

      <div className="mt-8 space-y-3">
        <Button className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/bookings")}>
          View My Bookings
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() =>
            downloadBookingICS({
              bookingNumber: booking.bookingNumber,
              scheduledStart: booking.scheduledStart,
              scheduledEnd: booking.scheduledEnd,
              serviceNames: booking.services.map((s) => s.serviceName),
            })
          }
        >
          <CalendarPlus className="size-4" />
          Add to Calendar
        </Button>
      </div>
    </main>
  );
}
