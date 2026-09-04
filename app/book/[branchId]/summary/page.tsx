"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// TEMPORARY stand-in for Module 5's real Checkout (docs/designs/08-checkout-page.jpeg).
// Exists only to prove the draft carries correctly end to end (services →
// stylist → slot) while Modules 5-6 (auth-at-checkout, basic-details step,
// coupon, Razorpay payment) aren't built yet. Delete once Module 5 ships.
export default function BookingSummaryPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const { draft, reset } = useBookingDraft();

  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId || !draft.slotId) router.replace("/book/start");
  }, [draft.services.length, draft.branchId, branchId, draft.slotId, router]);

  if (!draft.services.length || !draft.slotId) return null;

  const subtotal = draft.services.reduce((sum, s) => sum + s.basePrice, 0);

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Booking Draft</h1>
        <div className="size-8" />
      </div>

      <Alert className="mt-4 border-primary/40 text-foreground [&_svg]:text-primary">
        <Info className="size-4" />
        <AlertDescription>
          Module 4 stops here. Checkout, coupon, sign-in, and payment are Modules 5-6 — nothing below is submitted anywhere yet.
        </AlertDescription>
      </Alert>

      <Card className="mt-6 divide-y divide-border p-0">
        <div className="space-y-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Services</p>
          {draft.services.map((s) => (
            <div key={s.id} className="flex justify-between text-sm">
              <span>
                {s.name} <span className="text-muted-foreground">· {s.durationMinutes} min</span>
              </span>
              <span>₹{s.basePrice}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
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
      </Card>

      <Button
        variant="outline"
        className="mt-8 w-full"
        onClick={() => {
          reset();
          router.push("/book/start");
        }}
      >
        Start over
      </Button>
    </main>
  );
}
