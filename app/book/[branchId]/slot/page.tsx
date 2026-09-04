"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatTime12h, toISODate } from "@/lib/utils";
import type { AvailableSlot } from "@/lib/types";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import { SlotPicker } from "@/components/slot-picker";

// docs/designs/07-choose-slot.jpeg. GET /availability/slots is public and
// takes branchId/serviceIds/date — refetched every time the selected date
// changes (see components/slot-picker.tsx). Slot capacity here is
// branch-wide (chairs/active staff/override), independent of the stylist
// chosen on the previous screen per PROGRESS.md's Module 5 note; if that
// stylist turns out unavailable for the exact slot picked, the only place
// that's caught today is POST /bookings itself (Module 5) — surfaced there,
// not here.
export default function ChooseSlotPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const { draft, setSlot } = useBookingDraft();

  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId) router.replace("/book/start");
  }, [draft.services.length, draft.branchId, branchId, router]);

  if (!draft.services.length || draft.branchId !== branchId) return null;

  const continueToCheckout = (date: Date, slot: AvailableSlot) => {
    setSlot(toISODate(date), slot.slotId, `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`);
    router.push(`/book/${branchId}/checkout`);
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Select Date & Time</h1>
        <div className="size-8" />
      </div>

      <div className="mt-6">
        <SlotPicker
          branchId={branchId}
          serviceIds={draft.services.map((s) => s.id)}
          continueLabel="Continue"
          onContinue={continueToCheckout}
        />
      </div>
    </main>
  );
}
