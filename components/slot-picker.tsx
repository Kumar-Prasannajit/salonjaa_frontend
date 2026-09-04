"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Clock } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatTime12h, toISODate } from "@/lib/utils";
import type { AvailableSlot } from "@/lib/types";
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

// Extracted out of app/book/[branchId]/slot/page.tsx (Module 4) once
// app/bookings/[bookingId]/reschedule/page.tsx (Module 7) needed the exact
// same date-strip + GET /availability/slots + bucketed-grid behavior — same
// live public endpoint, just a different caller with a different next step.
export function SlotPicker({
  branchId,
  serviceIds,
  continueLabel = "Continue",
  onContinue,
}: {
  branchId: string;
  serviceIds: string[];
  continueLabel?: string;
  onContinue: (date: Date, slot: AvailableSlot) => void;
}) {
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
    let cancelled = false;
    setError("");
    setSlots(null);
    setSelectedSlot(null);
    apiFetch<AvailableSlot[]>(
      `/availability/slots?branchId=${branchId}&serviceIds=${serviceIds.join(",")}&date=${toISODate(selectedDate)}`,
      {},
      { auth: false }
    )
      .then((list) => !cancelled && setSlots(list.filter((s) => s.available)))
      .catch((e) => !cancelled && setError(messageFromError(e)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, serviceIds.join(","), selectedDate]);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
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
          onClick={() => selectedSlot && onContinue(selectedDate, selectedSlot)}
        >
          {continueLabel}
        </Button>
      </div>
    </>
  );
}
