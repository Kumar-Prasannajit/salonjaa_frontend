"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarX2, Clock } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatTime12h, toISODate } from "@/lib/utils";
import type { AvailableSlot } from "@/lib/types";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DAY_COUNT = 7;
const BUCKETS = [
  { label: "Morning", test: (h: number) => h < 12 },
  { label: "Afternoon", test: (h: number) => h >= 12 && h < 17 },
  { label: "Evening", test: (h: number) => h >= 17 },
] as const;

function startHour(slot: AvailableSlot) {
  return Number(slot.startTime.split(":")[0]);
}

// docs/designs/07-choose-slot.jpeg. GET /availability/slots is public and
// takes branchId/serviceIds/date — refetched every time the selected date
// changes. Slot capacity here is branch-wide (chairs/active staff/override),
// independent of the stylist chosen on the previous screen per PROGRESS.md's
// Module 5 note; if that stylist turns out unavailable for the exact slot
// picked, the only place that's caught today is POST /bookings itself
// (Module 5) — surfaced there, not here.
export default function ChooseSlotPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const { draft, setSlot } = useBookingDraft();

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [error, setError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId) router.replace("/book/start");
  }, [draft.services.length, draft.branchId, branchId, router]);

  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId) return;
    let cancelled = false;
    setError("");
    setSlots(null);
    setSelectedSlot(null);
    const serviceIds = draft.services.map((s) => s.id).join(",");
    apiFetch<AvailableSlot[]>(
      `/availability/slots?branchId=${branchId}&serviceIds=${serviceIds}&date=${toISODate(selectedDate)}`,
      {},
      { auth: false }
    )
      .then((list) => !cancelled && setSlots(list.filter((s) => s.available)))
      .catch((e) => !cancelled && setError(messageFromError(e)));
    return () => {
      cancelled = true;
    };
  }, [branchId, draft.services, draft.branchId, selectedDate]);

  const continueToSummary = () => {
    if (!selectedSlot) return;
    setSlot(toISODate(selectedDate), selectedSlot.slotId, `${formatTime12h(selectedSlot.startTime)} – ${formatTime12h(selectedSlot.endTime)}`);
    router.push(`/book/${branchId}/summary`);
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

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const isSelected = toISODate(d) === toISODate(selectedDate);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`flex min-w-16 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              <span className={isSelected ? "opacity-90" : "text-muted-foreground"}>
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="text-lg font-bold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>

      <div className="mt-4 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && slots === null && (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        )}

        {slots !== null && slots.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <CalendarX2 className="size-8 text-accent" />
            <p className="font-semibold">No slots available</p>
            <p className="text-sm text-muted-foreground">Try another date.</p>
          </Card>
        )}

        {slots &&
          slots.length > 0 &&
          BUCKETS.map(({ label, test }) => {
            const bucketSlots = slots.filter((s) => test(startHour(s)));
            if (!bucketSlots.length) return null;
            return (
              <div key={label}>
                <p className="mb-2 font-semibold">{label}</p>
                <div className="grid grid-cols-3 gap-3">
                  {bucketSlots.map((s) => {
                    const isSelected = selectedSlot?.slotId === s.slotId;
                    return (
                      <button
                        key={s.slotId}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                          isSelected ? "border-primary text-primary" : "border-border text-foreground"
                        }`}
                      >
                        {formatTime12h(s.startTime)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-8 space-y-3">
        {selectedSlot && (
          <Card className="flex-row items-center gap-3 p-4">
            <Clock className="size-4 text-primary" />
            <p className="text-sm">
              {selectedDate.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} •{" "}
              {formatTime12h(selectedSlot.startTime)}
            </p>
          </Card>
        )}
        <Button
          className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
          disabled={!selectedSlot}
          onClick={continueToSummary}
        >
          Continue
        </Button>
      </div>
    </main>
  );
}
