"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { toISODate } from "@/lib/utils";
import type { AvailableSlot, Branch, OwnerService, Staff } from "@/lib/types";
import { SlotPicker } from "@/components/slot-picker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// POST /salon-bookings/walk-in — booking.validator.ts's walkInSchema:
// customerName/customerPhone/services[]/staffId/bookingDate/slotId, staffId
// required (it's the only field that resolves branchId/salonId server-side,
// per PROGRESS.md's Module 6 note) and the booking is created straight to
// APPROVED. Mirrors the customer's services→stylist→slot ordering in one page.
export default function WalkInBookingPage() {
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [branchId, setBranchId] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<OwnerService[]>([]);
  const [staffId, setStaffId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [loadError, setLoadError] = useState("");
  const [branchDataError, setBranchDataError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Branch[] }>("/branches")
      .then((r) => setBranches(r.data))
      .catch((e) => setLoadError(messageFromError(e)));
  }, []);

  useEffect(() => {
    setStaff([]);
    setServices([]);
    setStaffId("");
    setSelectedServiceIds([]);
    if (!branchId) return;
    setBranchDataError("");
    Promise.all([apiFetch<{ data: Staff[] }>(`/staff?branchId=${branchId}`), apiFetch<{ data: OwnerService[] }>(`/services?branchId=${branchId}`)])
      .then(([staffResult, serviceResult]) => {
        setStaff(staffResult.data);
        setServices(serviceResult.data);
      })
      .catch((e) => setBranchDataError(messageFromError(e)));
  }, [branchId]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const readyForSlots = !!branchId && !!staffId && selectedServiceIds.length > 0 && customerName.trim() && customerPhone.trim();

  const submit = async (date: Date, slot: AvailableSlot) => {
    setSubmitError("");
    setBusy(true);
    try {
      const result = await apiFetch<{ data: { id: string; bookingNumber: string } }>("/salon-bookings/walk-in", {
        method: "POST",
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          services: selectedServiceIds,
          staffId,
          bookingDate: toISODate(date),
          slotId: slot.slotId,
        }),
      });
      setCreated(result.data.bookingNumber);
    } catch (e) {
      setSubmitError(messageFromError(e));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <main className="flex min-h-[70svh] flex-col items-center justify-center text-center">
        <CheckCircle2 className="size-12 text-success" />
        <h1 className="mt-4 text-xl font-semibold">Walk-in booked</h1>
        <p className="mt-2 text-sm text-muted-foreground">{created} was created and approved — walk-ins skip the approval step.</p>
        <Button className="mt-6 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/owner/bookings")}>
          Back to Bookings
        </Button>
      </main>
    );
  }

  return (
    <main>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-lg font-semibold md:text-2xl">Walk-in Booking</h1>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && branches === null && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {branches && (
        <div className="mt-6 space-y-5">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="walkin-branch">Branch</Label>
              <select
                id="walkin-branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Choose a branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {branchDataError && (
              <Alert variant="destructive">
                <AlertDescription>{branchDataError}</AlertDescription>
              </Alert>
            )}

            {branchId && (
              <>
                <div className="space-y-2">
                  <Label>Services</Label>
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services on this branch yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {services.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleService(s.id)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            selectedServiceIds.includes(s.id) ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walkin-staff">Staff</Label>
                  <select
                    id="walkin-staff"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Choose staff…</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="walkin-name">Customer name</Label>
                    <Input id="walkin-name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="walkin-phone">Customer phone</Label>
                    <Input id="walkin-phone" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </Card>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {readyForSlots && (
            <SlotPicker branchId={branchId} serviceIds={selectedServiceIds} continueLabel={busy ? "Creating…" : "Create Walk-in Booking"} onContinue={submit} />
          )}
        </div>
      )}
    </main>
  );
}
