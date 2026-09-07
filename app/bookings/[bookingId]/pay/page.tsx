"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, CreditCard, Info, Lock, Smartphone, Wallet } from "lucide-react";
import { apiFetch, ApiError, messageFromError } from "@/lib/api-client";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { BookingDetail, Payment, PaymentOrder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const METHODS = [
  { key: "upi", icon: Smartphone, label: "UPI", description: "Pay using any UPI app" },
  { key: "card", icon: CreditCard, label: "Cards", description: "Visa, Mastercard, RuPay" },
  { key: "wallet", icon: Wallet, label: "Wallets", description: "PhonePe, Paytm, Amazon Pay" },
  { key: "netbanking", icon: Building2, label: "Net Banking", description: "All major banks" },
] as const;

// docs/designs/09-payment-mode.jpeg. POST /payments/create-order requires
// the booking to be AWAITING_PAYMENT (Module 14b — was APPROVED before that
// shipped); this page is the "Pay Now" destination from an AWAITING_PAYMENT
// booking in My Bookings. A PAY_AT_SALON booking never reaches this state at
// all (approve goes straight to APPROVED), so it never lands here with
// anything to pay.
// Razorpay's Standard Checkout widget provides its own payment-method UI
// once opened — the method cards below aren't a substitute for that, they
// set `prefill.method` so the widget opens on the tab the customer already
// picked (Razorpay lets them switch inside the widget regardless).
export default function PayBookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  const [method, setMethod] = useState<(typeof METHODS)[number]["key"]>("upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissedNotice, setDismissedNotice] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch<{ booking: BookingDetail }>(`/bookings/${bookingId}`), apiFetch<{ data: Payment[] }>("/payments/my-payments")])
      .then(([bookingResult, paymentsResult]) => {
        setBooking(bookingResult.booking);
        if (paymentsResult.data.some((p) => p.bookingId === bookingId && p.status === "SUCCESS")) {
          setAlreadyPaid(true);
          router.replace(`/bookings/${bookingId}/confirmed`);
        }
      })
      .catch((e) => setLoadError(messageFromError(e)));
  }, [bookingId, router]);

  const pay = async () => {
    if (!booking) return;
    setError("");
    setDismissedNotice(false);
    setBusy(true);
    try {
      const order = await apiFetch<PaymentOrder>("/payments/create-order", { method: "POST", body: JSON.stringify({ bookingId }) });
      await openRazorpayCheckout({
        amount: Math.round(order.amount * 100), // Razorpay Checkout needs paise; create-order returns rupees
        currency: order.currency,
        name: "Salonjaa",
        description: booking.bookingNumber,
        order_id: order.orderId,
        prefill: { method },
        theme: { color: "#d9a044" },
        handler: (response) => verifyPayment(order.orderId, response.razorpay_payment_id, response.razorpay_signature),
        modal: { ondismiss: () => setDismissedNotice(true) },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("A payment attempt for this booking is already in progress or already went through — check My Bookings before retrying.");
      } else {
        setError(messageFromError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyPayment = async (orderId: string, paymentId: string, signature: string) => {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/payments/verify", { method: "POST", body: JSON.stringify({ orderId, paymentId, signature }) });
      router.push(`/bookings/${bookingId}/confirmed`);
    } catch (e) {
      // Backend marks the payment FAILED on a bad signature, which — per
      // payment.service.ts — the next create-order call is allowed to retry.
      setError(`${messageFromError(e)} You can try again below.`);
      setBusy(false);
    }
  };

  if (alreadyPaid) return null;

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Payment</h1>
        <div className="size-8" />
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !booking && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {booking && booking.bookingStatus !== "AWAITING_PAYMENT" && (
        <Card className="mt-6 flex flex-col items-center gap-3 border-dashed p-10 text-center">
          <Lock className="size-8 text-accent" />
          <p className="font-semibold">Not ready for payment yet</p>
          <p className="text-sm text-muted-foreground">
            {booking.bookingStatus === "PENDING"
              ? "The salon hasn't approved this booking yet."
              : booking.paymentMethod === "PAY_AT_SALON"
              ? "This booking doesn't need online payment — you'll pay at the salon."
              : booking.bookingStatus === "CANCELLED" && booking.cancellationReason
              ? `This booking was cancelled: ${booking.cancellationReason}.`
              : `This booking is ${booking.bookingStatus.toLowerCase().replace(/_/g, " ")} and can't be paid for.`}
          </p>
          <Button variant="outline" onClick={() => router.push("/bookings")}>
            Back to My Bookings
          </Button>
        </Card>
      )}

      {booking && booking.bookingStatus === "AWAITING_PAYMENT" && (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium">Select Payment Method</p>
          <div className="space-y-3">
            {METHODS.map(({ key, icon: Icon, label, description }) => (
              <Card
                key={key}
                onClick={() => setMethod(key)}
                className={`cursor-pointer flex-row items-center gap-3 p-4 transition-colors ${
                  method === key ? "border-primary" : "border-border"
                }`}
              >
                <div className="grid size-10 place-items-center rounded-lg border border-primary/40 bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className={`grid size-5 place-items-center rounded-full border ${method === key ? "border-primary bg-primary" : "border-border"}`} />
              </Card>
            ))}
          </div>

          {dismissedNotice && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Payment window closed. If this attempt didn&apos;t go through, retrying should work — but a payment stuck without a
                clear success or failure can&apos;t be retried until it resolves (no automatic timeout is wired up yet).
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full gap-2 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
            disabled={busy}
            onClick={pay}
          >
            <Lock className="size-4" />
            {busy ? "Please wait…" : `Pay ₹${booking.totalAmount}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Your payment information is safe and encrypted.</p>
        </div>
      )}
    </main>
  );
}
