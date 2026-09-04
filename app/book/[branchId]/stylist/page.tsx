"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, User } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { toISODate } from "@/lib/utils";
import type { AvailableStaff } from "@/lib/types";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// docs/designs/06-choose-stylist.jpeg. GET /availability/staff is public and
// day-level (no time param) — see PROGRESS.md's Module 5 note — so this
// screen queries against *today* even though no date has been picked yet in
// the flow (date selection is the next screen). A staff member on partial-day
// leave can still appear here; the real per-slot conflict is only caught by
// GET /availability/slots (next screen) and, ultimately, at
// POST /bookings itself. The design shows avatar photos, a role title, and a
// star rating per stylist — none of those exist on this response
// (staffId/name/type only), so this renders initials + name + type, nothing
// fabricated.
export default function ChooseStylistPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const { draft, setStylist } = useBookingDraft();

  const [staff, setStaff] = useState<AvailableStaff[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AvailableStaff | null>(null);

  // No service selection in the draft (or it's for a different branch) means
  // this route was reached directly, not via the flow — nothing to query
  // staff availability for.
  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId) router.replace("/book/start");
  }, [draft.services.length, draft.branchId, branchId, router]);

  useEffect(() => {
    if (!draft.services.length || draft.branchId !== branchId) return;
    let cancelled = false;
    setError("");
    setStaff(null);
    const serviceIds = draft.services.map((s) => s.id).join(",");
    apiFetch<AvailableStaff[]>(
      `/availability/staff?branchId=${branchId}&serviceIds=${serviceIds}&date=${toISODate(new Date())}`,
      {},
      { auth: false }
    )
      .then((list) => !cancelled && setStaff(list))
      .catch((e) => !cancelled && setError(messageFromError(e)));
    return () => {
      cancelled = true;
    };
  }, [branchId, draft.services, draft.branchId]);

  const proceed = (staffId: string | null, staffName: string | null) => {
    setStylist(staffId, staffName);
    router.push(`/book/${branchId}/slot`);
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Choose Your Professional</h1>
        <div className="size-8" />
      </div>
      <p className="mt-1 text-center text-sm text-muted-foreground md:text-left">Select the best professional for you</p>

      <div className="mt-6 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && staff === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {staff !== null && staff.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <User className="size-8 text-accent" />
            <p className="font-semibold">No eligible stylist available</p>
            <p className="text-sm text-muted-foreground">You can still continue — a stylist will be assigned by the salon.</p>
          </Card>
        )}

        {staff?.map((member) => {
          const isSelected = selected?.staffId === member.staffId;
          return (
            <Card
              key={member.staffId}
              onClick={() => setSelected(isSelected ? null : member)}
              className={`cursor-pointer flex-row items-center gap-3 p-4 transition-colors ${
                isSelected ? "border-primary" : "border-border"
              }`}
            >
              <Avatar size="lg">
                <AvatarFallback className="bg-secondary font-semibold">
                  {member.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.type}</p>
              </div>
              <div
                className={`grid size-6 place-items-center rounded-full border ${
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {isSelected && <Check className="size-3.5" />}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => proceed(null, null)}>
          Skip
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
          disabled={!selected}
          onClick={() => selected && proceed(selected.staffId, selected.name)}
        >
          Continue
        </Button>
      </div>
    </main>
  );
}
