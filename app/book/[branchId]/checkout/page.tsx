"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgePercent, Check } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { BookingCreateResult, CouponValidation } from "@/lib/types";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import { useAccountContext } from "@/hooks/account-context";
import { useToastContext } from "@/hooks/toast-context";
import { CheckoutAuthStep } from "@/components/checkout-auth-step";
import { CheckoutBasicDetailsStep } from "@/components/checkout-basic-details-step";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

// docs/designs/08-checkout-page.jpeg, with three real deviations from the
// literal design, all forced by how the backend actually works rather than a
// frontend choice:
//
// 1. The design's CTA reads "Proceed to Payment", but POST /payments/create-order
//    requires the booking to already be AWAITING_PAYMENT (Module 14b — an
//    online booking only reaches that once the salon approves it) — a
//    customer cannot pay at this point in the flow. This button creates the
//    PENDING booking and requests approval; actual payment happens later,
//    from My Bookings, once the salon approves. Labeled accordingly rather
//    than promising something that can't happen yet.
// 2. The design shows a flat "Taxes & Fees" line — no tax/fee schedule exists
//    anywhere in the API, so nothing here is fabricated to fill that row; it's
//    omitted entirely.
// 3. A payment-method choice (Module 14b, no design mockup exists for it)
//    lets the customer pick PAY_AT_SALON instead of the ONLINE default — that
//    booking skips the AWAITING_PAYMENT/online-payment step entirely and
//    goes straight to APPROVED once the salon approves it.
//
// The coupon-validate call is real and live, but its result is *informational
// only*: no documented endpoint anywhere attaches a coupon to a booking (POST
// /bookings has no couponCode field), so a validated discount is never
// actually deducted from what payment will later charge. Showing a
// discounted "Total" here would misrepresent the real charge, so the
// subtotal shown is never adjusted by it — the coupon card just confirms
// validity and states plainly that it isn't applied yet.
export default function CheckoutPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const { draft } = useBookingDraft();
  const account = useAccountContext();
  const { isAuthenticated, user } = account;
  const toast = useToastContext();

  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "PAY_AT_SALON">("ONLINE");

  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  const [bookingError, setBookingError] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);

  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId || !draft.slotId) router.replace("/book/start");
  }, [draft.services.length, draft.branchId, branchId, draft.slotId, router]);

  if (!draft.services.length || !draft.slotId) return null;

  const subtotal = draft.services.reduce((sum, s) => sum + s.basePrice, 0);
  const step = !isAuthenticated || !user ? "auth" : !user.name ? "details" : "summary";

  const applyCoupon = async () => {
    setCouponError("");
    setCouponResult(null);
    setCouponBusy(true);
    try {
      const result = await apiFetch<CouponValidation>("/payments/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ couponCode, bookingAmount: subtotal }),
      });
      setCouponResult(result);
      toast.success(`${couponCode} is valid — ₹${result.discount} off.`);
    } catch (e) {
      const msg = messageFromError(e);
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setCouponBusy(false);
    }
  };

  const confirmBooking = async () => {
    if (!draft.salonId) {
      setBookingError("Missing salon ID in the booking draft — restart the flow from /book/start.");
      return;
    }
    setBookingError("");
    setBookingBusy(true);
    try {
      const body: Record<string, unknown> = {
        salonId: draft.salonId,
        branchId,
        services: draft.services.map((s) => s.id),
        bookingDate: draft.date,
        slotId: draft.slotId,
        paymentMethod,
      };
      if (draft.staffId) body.staffId = draft.staffId;

      const result = await apiFetch<BookingCreateResult>("/bookings", { method: "POST", body: JSON.stringify(body) });
      router.push(`/book/${branchId}/requested?bookingId=${result.bookingId}&status=${result.status}&paymentMethod=${paymentMethod}`);
    } catch (e) {
      // The real backend message (e.g. "Selected staff is no longer
      // available for this time") is more useful than a generic override —
      // surfaced via both the inline alert and a toast, since this button
      // sits at the bottom of a scrollable page and an inline-only message
      // can render off-screen.
      const msg = messageFromError(e);
      setBookingError(msg);
      toast.error(msg);
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Checkout</h1>
        <div className="size-8" />
      </div>

      <div className="mt-6 space-y-4">
        {step === "auth" && (
          <CheckoutAuthStep
            stage={account.stage}
            email={account.email}
            otp={account.otp}
            busy={account.busy}
            cooldown={account.cooldown}
            error={account.error}
            notice={account.notice}
            setEmail={account.setEmail}
            setOtp={account.setOtp}
            setStage={account.setStage}
            sendOtp={account.sendOtp}
            verifyOtp={account.verifyOtp}
            clearFeedback={account.clearFeedback}
          />
        )}

        {step === "details" && (
          <CheckoutBasicDetailsStep
            profile={account.profile}
            setProfile={account.setProfile}
            saveProfile={account.saveProfile}
            busy={account.busy}
            error={account.error}
          />
        )}

        {step === "summary" && (
          <>
            <Card className="divide-y divide-border p-0">
              <div className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Booking Summary</p>
                {draft.services.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span>₹{s.basePrice}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Professional</span>
                  <span>{draft.staffName || "No preference"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span>
                    {draft.date} • {draft.slotLabel}
                  </span>
                </div>
              </div>
              <div className="flex justify-between p-4 text-base font-semibold">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-medium">Payment Method</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("ONLINE")}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    paymentMethod === "ONLINE" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  Pay Online
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("PAY_AT_SALON")}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    paymentMethod === "PAY_AT_SALON" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  Pay at Salon
                </button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BadgePercent className="size-4 text-primary" />
                Have a coupon?
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1"
                />
                <Button type="button" variant="outline" disabled={!couponCode || couponBusy} onClick={applyCoupon}>
                  {couponBusy ? "Checking…" : "Apply"}
                </Button>
              </div>
              {couponError && <p className="mt-2 text-sm text-destructive">{couponError}</p>}
              {couponResult?.valid && (
                <div className="mt-2 flex items-start gap-2 text-sm text-success">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  <p>
                    {couponCode} is valid — ₹{couponResult.discount} off.{" "}
                    <span className="text-muted-foreground">
                      Not deducted here — there&apos;s no way to attach a coupon to a booking yet, so this is a preview only. The final
                      payable amount is set once the salon approves and payment opens.
                    </span>
                  </p>
                </div>
              )}
            </Card>

            {bookingError && (
              <Alert variant="destructive">
                <AlertDescription>{bookingError}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
              disabled={bookingBusy}
              onClick={confirmBooking}
            >
              {bookingBusy ? "Sending request…" : "Confirm Booking Request"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {paymentMethod === "ONLINE"
                ? "This reserves your slot and sends the salon your request — once approved, you'll have a short window to pay online."
                : "This reserves your slot and sends the salon your request — you'll pay at the salon once approved."}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
