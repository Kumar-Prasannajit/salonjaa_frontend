"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ticket } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useAccountContext } from "@/hooks/account-context";
import type { BookingDetail } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

// POST /bookings/claim (Module 23) — entirely new feature, no design mockup
// exists. Links a walk-in booking (created by the salon, never online) to
// the caller's account by its customer-facing bookingNumber — the same
// code already shown on booking detail/confirmation screens, which a
// walk-in customer would have from their salon receipt. `payOnline`
// additionally switches an unpaid APPROVED walk-in from PAY_AT_SALON to
// ONLINE/AWAITING_PAYMENT, reusing the existing POST /payments/create-order
// flow — so a successful claim with `payOnline` checked and honored routes
// straight to the pay page instead of My Bookings. No tab bar (drill-in
// from Profile, not a bottom-nav destination), redirects to /profile if
// signed out, same pattern as app/profile/addresses/page.tsx.
export default function ClaimBookingPage() {
  const account = useAccountContext();
  const router = useRouter();

  const [bookingNumber, setBookingNumber] = useState("");
  const [payOnline, setPayOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Gated on authChecked too — otherwise this fires on the initial
  // isAuthenticated:false before useAccount's mount-time cookie-restore has
  // resolved, bouncing an actually-still-signed-in visitor (e.g. a hard
  // reload of this page) straight back to /profile.
  useEffect(() => {
    if (account.authChecked && !account.isAuthenticated) router.replace("/profile");
  }, [account.authChecked, account.isAuthenticated, router]);

  if (!account.isAuthenticated) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiFetch<{ success: true; data: BookingDetail }>("/bookings/claim", {
        method: "POST",
        body: JSON.stringify({ bookingNumber: bookingNumber.trim(), payOnline }),
      });
      if (result.data.bookingStatus === "AWAITING_PAYMENT") {
        router.push(`/bookings/${result.data.id}/pay`);
      } else {
        router.push("/bookings");
      }
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/profile")} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Claim a Walk-in Booking</h1>
        <div className="size-8" />
      </div>

      <Card className="mt-6 flex flex-col items-center gap-3 p-6 text-center">
        <Ticket className="size-8 text-primary" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          Had a walk-in appointment booked for you at the salon? Enter its booking number (from your salon receipt or confirmation) to
          add it to My Bookings.
        </p>
      </Card>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="claim-booking-number">Booking Number</Label>
          <Input
            id="claim-booking-number"
            required
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value.toUpperCase())}
            placeholder="SLJ-XXXXXXXX"
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={payOnline} onCheckedChange={(v) => setPayOnline(v === true)} className="mt-0.5" />
          <span>
            Pay online now, if this booking is approved and still unpaid.
            <span className="block text-xs text-muted-foreground">Leave unchecked to keep paying at the salon as originally planned.</span>
          </span>
        </label>
        <Button
          type="submit"
          disabled={busy || !bookingNumber.trim()}
          className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
        >
          {busy ? "Claiming…" : "Claim Booking"}
        </Button>
      </form>
    </main>
  );
}
