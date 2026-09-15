"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgePercent, Check } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { BookingCreateResult, CouponValidation, Wallet } from "@/lib/types";
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
//    goes straight to APPROVED once the salon approves it. Module 20 adds a
//    third option, WALLET — debits the full total immediately at creation
//    time (422, no booking created, if the balance is short), so the
//    wallet balance is fetched once authenticated to disable it upfront
//    rather than let the customer hit that 422 blind.
//
// BUG-005 fix — Module 12 (see ../../../../KNOWN_BACKEND_LIMITATIONS.md) made this real:
// POST /bookings now accepts an optional couponCode and snapshots a real discountAmount onto
// the booking. The comment block above described the old state (validate-only, never
// attached) — confirmBooking() below now sends couponCode when a coupon has been validated,
// and the summary card shows the resulting Subtotal/Discount/Total instead of a flat
// undiscounted total plus a "preview only" disclaimer.
export default function CheckoutPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const { draft } = useBookingDraft();
  const account = useAccountContext();
  const { isAuthenticated, user } = account;
  const toast = useToastContext();

  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "PAY_AT_SALON" | "WALLET">("ONLINE");
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  const [bookingError, setBookingError] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);

  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId || !draft.slotId) router.replace("/book/start");
  }, [draft.services.length, draft.branchId, branchId, draft.slotId, router]);

  // Module 20 — GET /wallet, fetched once the customer has both an account
  // and a name on file (the last gate before the "summary" step below) so
  // this disables the WALLET option upfront instead of letting the customer
  // hit POST /bookings' 422 blind.
  useEffect(() => {
    if (!isAuthenticated || !user?.name) return;
    apiFetch<{ data: Wallet }>("/wallet")
      .then((r) => setWallet(r.data))
      .catch(() => {
        // A failed fetch just leaves the WALLET option disabled below
        // (walletInsufficient defaults true when wallet is null).
      });
  }, [isAuthenticated, user?.name]);

  if (!draft.services.length || !draft.slotId) return null;

  const subtotal = draft.services.reduce((sum, s) => sum + s.price, 0);
  const step = !isAuthenticated || !user ? "auth" : !user.name ? "details" : "summary";
  const walletInsufficient = !wallet || wallet.balance < subtotal;

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
        // Module 22 — bare serviceId when no variant was chosen (still valid
        // for a no-variant service), {serviceId, variantId} otherwise. Select
        // Services never lets a variant-required service into the draft
        // without a variantId, so this can't send an incomplete entry.
        services: draft.services.map((s) => (s.variantId ? { serviceId: s.id, variantId: s.variantId } : s.id)),
        bookingDate: draft.date,
        slotId: draft.slotId,
        paymentMethod,
      };
      if (draft.staffId) body.staffId = draft.staffId;
      // BUG-005 fix — only sent once the code has actually been validated against this
      // subtotal (couponResult.valid), never the raw typed text — if the customer edits the
      // code after validating, couponResult is cleared below so a stale/unvalidated code can't
      // slip through.
      if (couponResult?.valid) body.couponCode = couponCode;

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
                    <span>
                      {s.name}
                      {s.variantName && <span className="text-muted-foreground"> — {s.variantName}</span>}
                    </span>
                    <span>₹{s.price}</span>
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
              <div className="space-y-1 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {couponResult?.valid && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount ({couponCode})</span>
                    <span>-₹{couponResult.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>₹{Math.max(0, subtotal - (couponResult?.valid ? couponResult.discount : 0))}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-medium">Payment Method</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
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
                <button
                  type="button"
                  disabled={walletInsufficient}
                  onClick={() => setPaymentMethod("WALLET")}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    paymentMethod === "WALLET" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  Wallet
                </button>
              </div>
              {/* Module 16 — can't know upfront whether this specific customer is
                  restricted (that's server-side strike history), so this only sets
                  expectations rather than fabricating a definite outcome; the real
                  answer comes back on the created booking and is acted on from
                  app/book/[branchId]/requested/page.tsx. */}
              {paymentMethod === "PAY_AT_SALON" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  If your account requires it, you&apos;ll be asked to pay a small advance right after this request is sent, before the
                  salon can review it.
                </p>
              )}
              {/* Module 20 — GET /wallet, fetched once authenticated so this
                  disables upfront instead of letting the customer hit
                  POST /bookings' 422 blind. */}
              <p className="mt-2 text-xs text-muted-foreground">
                {wallet
                  ? walletInsufficient
                    ? `Wallet balance ₹${wallet.balance} — not enough to cover this booking.`
                    : `Wallet balance: ₹${wallet.balance}`
                  : "Checking wallet balance…"}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BadgePercent className="size-4 text-primary" />
                Have a coupon?
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponResult(null);
                  }}
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
                    {couponCode} applied — ₹{couponResult.discount} off. <span className="text-muted-foreground">Reflected in the total above.</span>
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
              {paymentMethod === "ONLINE" &&
                "This reserves your slot and sends the salon your request — once approved, you'll have a short window to pay online."}
              {paymentMethod === "PAY_AT_SALON" && "This reserves your slot and sends the salon your request — you'll pay at the salon once approved."}
              {paymentMethod === "WALLET" &&
                "This charges your wallet balance in full right now and sends the salon your request. If the booking is cancelled, rejected, or expires, the full amount is refunded back to your wallet automatically."}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
