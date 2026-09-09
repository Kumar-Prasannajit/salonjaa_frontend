"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Stands in for docs/designs/10-booking-confirmed.jpeg, but deliberately not
// that screen: POST /bookings only ever creates a PENDING booking (see
// checkout/page.tsx's note on why payment can't happen yet), so nothing here
// is actually "confirmed" — no confetti, no "Total Paid", no checkmark. This
// is the honest state: booking requested, awaiting the salon's approval.
// The real "Booking Confirmed" screen belongs after Module 7's My Bookings
// gets a "Pay Now" action and Module 6's payment succeeds.
export default function BookingRequestedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, reset } = useBookingDraft();

  const bookingId = searchParams.get("bookingId");
  const status = searchParams.get("status");
  const paymentMethod = searchParams.get("paymentMethod");

  // Guard against landing here directly with no booking result — this page
  // only makes sense right after checkout/page.tsx's confirmBooking() redirect.
  useEffect(() => {
    if (!bookingId) router.replace("/book/start");
  }, [bookingId, router]);

  if (!bookingId) return null;

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-full border-2 border-primary/60">
          <Clock className="size-8 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-primary">Booking Requested!</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {paymentMethod === "PAY_AT_SALON"
            ? "The salon will review your request and confirm shortly. You'll pay at the salon — no online payment needed."
            : "The salon will review your request and confirm shortly. You'll be notified, and can then pay from My Bookings."}
        </p>
      </div>

      <Card className="mt-6 divide-y divide-border p-0">
        <div className="space-y-1 p-4">
          {draft.services.map((s) => (
            <div key={s.id} className="flex justify-between text-sm">
              <span>
                {s.name}
                {s.variantName && <span className="text-muted-foreground"> — {s.variantName}</span>}
              </span>
              <span>₹{s.price}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between p-4 text-sm">
          <span className="text-muted-foreground">Professional</span>
          <span className="font-medium">{draft.staffName || "No preference"}</span>
        </div>
        <div className="flex justify-between p-4 text-sm">
          <span className="text-muted-foreground">Date & Time</span>
          <span className="font-medium">
            {draft.date} • {draft.slotLabel}
          </span>
        </div>
        <div className="flex justify-between p-4 text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium text-primary">{status || "PENDING"}</span>
        </div>
        <div className="flex justify-between p-4 text-xs text-muted-foreground">
          <span>Booking ID</span>
          <span className="font-mono">{bookingId}</span>
        </div>
      </Card>

      <div className="mt-8 space-y-3">
        <Button className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/bookings")}>
          View My Bookings
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            reset();
            router.push("/book/start");
          }}
        >
          Book another appointment
        </Button>
      </div>
    </main>
  );
}
