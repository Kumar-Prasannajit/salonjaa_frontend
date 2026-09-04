"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useBookingDraft } from "@/hooks/booking-draft-context";
import type { DraftService } from "@/hooks/booking-draft-context";

// TEMPORARY DEV-ONLY ENTRY POINT — delete this route once Module 3 (Salon
// Details + Select Services) ships and can hand off a real branchId/salonId/
// selected-services list into the booking draft itself. Modules 4-7 (Choose
// Stylist → Choose Slot → Checkout → Payment) all need that starting state to
// exist, but nothing upstream produces it yet (blocked on
// docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md) — this form exists purely so the
// live /availability/staff and /availability/slots calls further down the
// flow have a real branchId + serviceIds to query against during development.
// Not linked from anywhere in the main nav.
export default function BookingFlowStartPage() {
  const router = useRouter();
  const { setServices } = useBookingDraft();
  const [branchId, setBranchId] = useState("");
  const [salonId, setSalonId] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const services: DraftService[] = [];
    for (const line of servicesText.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const [id, name, duration, price] = line.split("|").map((p) => p.trim());
      if (!id || !name || !duration || !price) {
        setError(`Couldn't parse line: "${line}". Expected id|name|durationMinutes|basePrice.`);
        return;
      }
      services.push({ id, name, durationMinutes: Number(duration), basePrice: Number(price) });
    }
    if (!branchId.trim() || services.length === 0) {
      setError("Branch ID and at least one service are required.");
      return;
    }

    setServices(branchId.trim(), salonId.trim(), services);
    router.push(`/book/${branchId.trim()}/stylist`);
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <h1 className="text-lg font-semibold">Dev: start a test booking</h1>
      <Alert className="mt-4 border-primary/40 text-foreground [&_svg]:text-primary">
        <Info className="size-4" />
        <AlertDescription>
          Temporary — stands in for Select Services (Module 3) until the public browse contract ships. Use a
          real branchId + service IDs from your backend (Postman/db:seed data).
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6 p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branchId">Branch ID</Label>
            <Input id="branchId" required value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salonId">
              Salon ID <small className="text-muted-foreground">(needed later, at Checkout)</small>
            </Label>
            <Input id="salonId" value={salonId} onChange={(e) => setSalonId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="services">Services — one per line: id|name|durationMinutes|basePrice</Label>
            <textarea
              id="services"
              required
              rows={5}
              value={servicesText}
              onChange={(e) => setServicesText(e.target.value)}
              placeholder={"service_1|Haircut (Unisex)|45|499\nservice_2|Hair Spa|60|699"}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
            Start booking flow
          </Button>
        </form>
      </Card>
    </main>
  );
}
