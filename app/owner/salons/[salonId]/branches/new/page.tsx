"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { Branch } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BLANK = {
  name: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  totalChairs: "1",
  openingTime: "09:00",
  closingTime: "21:00",
};

// POST /branches — branch.validator.ts's createBranchSchema is the exact
// field/validation source (chair count > 0, opening before closing).
export default function NewBranchPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const router = useRouter();
  const toast = useToastContext();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body: Record<string, string | number> = {
        salonId,
        name: form.name.trim(),
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        totalChairs: Number(form.totalChairs),
        openingTime: form.openingTime,
        closingTime: form.closingTime,
      };
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.email.trim()) body.email = form.email.trim();
      if (form.addressLine2.trim()) body.addressLine2 = form.addressLine2.trim();
      if (form.latitude.trim()) body.latitude = Number(form.latitude);
      if (form.longitude.trim()) body.longitude = Number(form.longitude);

      const result = await apiFetch<{ data: Branch }>("/branches", { method: "POST", body: JSON.stringify(body) });
      toast.success("Branch created.");
      router.replace(`/owner/branches/${result.data.id}`);
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="font-serif text-lg font-semibold md:text-2xl">New Branch</h1>
      </div>

      <Card className="mt-6 max-w-2xl p-5">
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch name</Label>
            <Input id="branch-name" required value={form.name} onChange={set("name")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-phone">Phone</Label>
              <Input id="branch-phone" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-email">Email</Label>
              <Input id="branch-email" type="email" value={form.email} onChange={set("email")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch-address1">Address line 1</Label>
            <Input id="branch-address1" required value={form.addressLine1} onChange={set("addressLine1")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-address2">Address line 2</Label>
            <Input id="branch-address2" value={form.addressLine2} onChange={set("addressLine2")} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-city">City</Label>
              <Input id="branch-city" required value={form.city} onChange={set("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-state">State</Label>
              <Input id="branch-state" required value={form.state} onChange={set("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-postal">Postal code</Label>
              <Input id="branch-postal" required value={form.postalCode} onChange={set("postalCode")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-lat">Latitude</Label>
              <Input id="branch-lat" type="number" step="any" value={form.latitude} onChange={set("latitude")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-lng">Longitude</Label>
              <Input id="branch-lng" type="number" step="any" value={form.longitude} onChange={set("longitude")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="branch-chairs">Total chairs</Label>
              <Input id="branch-chairs" type="number" min="1" required value={form.totalChairs} onChange={set("totalChairs")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-open">Opens</Label>
              <Input id="branch-open" type="time" required value={form.openingTime} onChange={set("openingTime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-close">Closes</Label>
              <Input id="branch-close" type="time" required value={form.closingTime} onChange={set("closingTime")} />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
            {busy ? "Creating…" : "Create branch"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
