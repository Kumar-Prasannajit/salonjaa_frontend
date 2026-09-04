"use client";

import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { Button } from "@/components/ui/button";

// Placeholder — Module 6 builds the real docs/designs/09-payment-mode.jpeg
// and docs/designs/10-booking-confirmed.jpeg here (Razorpay create-order +
// verify). This route exists now so booking-card.tsx's "Pay Now" button
// (shown on APPROVED bookings) has somewhere real to land instead of a
// dead link.
export default function PayBookingPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center">
      <ComingSoon icon={Wallet} title="Payment" description="Razorpay checkout for this booking lands in Module 6." />
      <Button variant="outline" className="-mt-8" onClick={() => router.push("/bookings")}>
        Back to My Bookings
      </Button>
    </div>
  );
}
