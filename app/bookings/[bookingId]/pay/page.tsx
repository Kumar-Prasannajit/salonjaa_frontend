"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Info, Lock } from "lucide-react";
import { apiFetch, ApiError, messageFromError } from "@/lib/api-client";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { useToastContext } from "@/hooks/toast-context";
import type { BookingDetail, Payment, PaymentOrder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// docs/designs/09-payment-mode.jpeg. POST /payments/create-order requires
// the booking to be AWAITING_PAYMENT (Module 14b — was APPROVED before that
// shipped); this page is the "Pay Now" destination from an AWAITING_PAYMENT
// booking in My Bookings. A PAY_AT_SALON booking never reaches this state at
// all (approve goes straight to APPROVED).
//
// Module 16 adds a second, independent reason to land here: a restricted
// customer's PENDING PAY_AT_SALON booking with requiresAdvancePayment needs
// its 10%-of-total advance settled before the salon can even review it.
// create-order auto-detects this (same endpoint, same {bookingId} body, no
// separate advance route) and returns an order for just the advance amount
// — this page only needs to gate on it and adjust copy/amount shown, the
// actual pay()/verifyPayment() calls are unchanged either way.
//
// GAP-002 fix — the design's UPI/Card/Wallet/Netbanking method picker is gone. It only ever
// set Razorpay's `prefill.method` (which tab its own widget opens on first) — the widget
// always shows its full method-selection UI regardless and the customer could already switch
// inside it either way, so the picker was a duplicate selection step with no real effect.
// Straight to a single "Pay ₹X" action that opens Razorpay directly, no prefill.
export default function PayBookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [hasSuccessfulPayment, setHasSuccessfulPayment] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissedNotice, setDismissedNotice] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch<{ booking: BookingDetail }>(`/bookings/${bookingId}`), apiFetch<{ data: Payment[] }>("/payments/my-payments")])
      .then(([bookingResult, paymentsResult]) => {
        const booking = bookingResult.booking;
        const paid = paymentsResult.data.some((p) => p.bookingId === bookingId && p.status === "SUCCESS");
        setBooking(booking);
        setHasSuccessfulPayment(paid);
        // Only an ONLINE booking's full payment lands on the "Confirmed"
        // screen — an advance payment for a still-PENDING PAY_AT_SALON
        // booking is real money moved, but the booking itself isn't
        // confirmed yet (still awaiting the salon's decision).
        if (paid && booking.paymentMethod === "ONLINE") router.replace(`/bookings/${bookingId}/confirmed`);
      })
      .catch((e) => setLoadError(messageFromError(e)));
  }, [bookingId, router]);

  const advanceDue = !!booking && booking.bookingStatus === "PENDING" && booking.requiresAdvancePayment && !hasSuccessfulPayment;
  const advancePaidAwaitingApproval = !!booking && booking.bookingStatus === "PENDING" && booking.requiresAdvancePayment && hasSuccessfulPayment;
  const payable = booking?.bookingStatus === "AWAITING_PAYMENT" || advanceDue;
  const amountDue = advanceDue ? booking?.advanceAmount ?? 0 : booking?.totalAmount ?? 0;

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
        name: "Book My Charm",
        description: booking.bookingNumber,
        order_id: order.orderId,
        theme: { color: "#a9713f" },
        handler: (response) => verifyPayment(order.orderId, response.razorpay_payment_id, response.razorpay_signature),
        modal: {
          ondismiss: () => {
            setDismissedNotice(true);
            toast.warning("Payment window closed before completing.");
            void cancelDismissedOrder(order.orderId);
          },
        },
      });
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 409
          ? "A payment attempt for this booking is already in progress or already went through — check My Bookings before retrying."
          : messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // POST /payments/create-order only returns { orderId, amount, currency } (no paymentId,
  // per frontend_handover.md), so the ondismiss handler can't call POST /payments/:paymentId/cancel
  // directly — it has to resolve the paymentId itself first via GET /payments/my-payments,
  // matching on providerOrderId. Runs best-effort: if this fails, the payment.expire backstop
  // job still cleans it up within PAYMENT_ORDER_EXPIRY_MINUTES, so no user-facing error here.
  const cancelDismissedOrder = async (orderId: string) => {
    try {
      const { data } = await apiFetch<{ data: Payment[] }>("/payments/my-payments");
      const pending = data.find((p) => p.providerOrderId === orderId && p.status === "PENDING");
      if (!pending) return;
      await apiFetch(`/payments/${pending.id}/cancel`, { method: "POST" });
    } catch {
      // 404 (already gone) or 409 (already resolved by /verify landing first) are both fine —
      // and any other failure just means the automatic expiry backstop handles it instead.
    }
  };

  const verifyPayment = async (orderId: string, paymentId: string, signature: string) => {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/payments/verify", { method: "POST", body: JSON.stringify({ orderId, paymentId, signature }) });
      if (advanceDue) {
        toast.success("Advance paid — your booking is now waiting on the salon's approval.");
        router.push("/bookings");
      } else {
        toast.success("Payment successful.");
        router.push(`/bookings/${bookingId}/confirmed`);
      }
    } catch (e) {
      // Backend marks the payment FAILED on a bad signature, which — per
      // payment.service.ts — the next create-order call is allowed to retry.
      const msg = `${messageFromError(e)} You can try again below.`;
      setError(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  if (hasSuccessfulPayment && booking?.paymentMethod === "ONLINE") return null;

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12 lg:max-w-2xl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center font-serif text-lg font-semibold md:text-left md:text-2xl">Payment</h1>
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

      {booking && !payable && (
        <Card className="mt-6 flex flex-col items-center gap-3 border-dashed p-10 text-center">
          <Lock className="size-8 text-accent" />
          <p className="font-semibold">{advancePaidAwaitingApproval ? "Advance paid" : "Not ready for payment yet"}</p>
          <p className="text-sm text-muted-foreground">
            {advancePaidAwaitingApproval
              ? "Your advance payment went through — this booking is now waiting on the salon's approval. The remainder stays payable at the salon."
              : booking.bookingStatus === "PENDING"
              ? "The salon hasn't approved this booking yet."
              : booking.paymentMethod === "PAY_AT_SALON"
              ? "This booking doesn't need online payment — you'll pay at the salon."
              : booking.paymentMethod === "WALLET"
              ? "This booking was already paid in full from your wallet — no online payment needed."
              : booking.bookingStatus === "CANCELLED" && booking.cancellationReason
              ? `This booking was cancelled: ${booking.cancellationReason}.`
              : `This booking is ${booking.bookingStatus.toLowerCase().replace(/_/g, " ")} and can't be paid for.`}
          </p>
          <Button variant="outline" onClick={() => router.push("/bookings")}>
            Back to My Bookings
          </Button>
        </Card>
      )}

      {booking && payable && (
        <div className="mt-6 space-y-4">
          {advanceDue && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Your recent booking history requires a ₹{booking.advanceAmount} advance (10% of the ₹{booking.totalAmount} total) before
                the salon can review this request. The remaining ₹{booking.totalAmount - (booking.advanceAmount ?? 0)} stays payable at
                the salon.
              </AlertDescription>
            </Alert>
          )}
          <Card className="p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Booking</span>
              <span className="font-medium">{booking.bookingNumber}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-semibold">
              <span>{advanceDue ? "Advance Due" : "Total Payable"}</span>
              <span>₹{amountDue}</span>
            </div>
          </Card>

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
            className="w-full gap-2 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90"
            disabled={busy}
            onClick={pay}
          >
            <Lock className="size-4" />
            {busy ? "Please wait…" : `Pay ₹${amountDue}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Your payment information is safe and encrypted.</p>
        </div>
      )}
    </main>
  );
}
