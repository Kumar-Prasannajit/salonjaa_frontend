"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { Salon } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// POST /salons — frontend_handover.md: "explain salon remains pending Admin
// review; disable submit while loading." No self-service "become an owner"
// flow exists (SALON_OWNER must already be on the token), so this form is
// only reachable at all once RoleGuard has already confirmed that.
export default function NewSalonPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", businessName: "", gstNumber: "", panNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body: Record<string, string> = { name: form.name.trim() };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.businessName.trim()) body.businessName = form.businessName.trim();
      if (form.gstNumber.trim()) body.gstNumber = form.gstNumber.trim();
      if (form.panNumber.trim()) body.panNumber = form.panNumber.trim();
      const result = await apiFetch<{ data: Salon }>("/salons", { method: "POST", body: JSON.stringify(body) });
      router.replace(`/owner/salons/${result.data.id}`);
    } catch (e) {
      setError(messageFromError(e));
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
        <h1 className="text-lg font-semibold md:text-2xl">New Salon</h1>
      </div>

      <Card className="mt-6 p-5">
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Alert className="border-primary/40 text-primary [&_svg]:text-primary">
            <AlertDescription>A new salon stays invisible to customers until an Admin verifies it.</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="salon-name">Salon name</Label>
            <Input id="salon-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salon-description">Description</Label>
            <textarea
              id="salon-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salon-business-name">Business name</Label>
            <Input id="salon-business-name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salon-gst">GST number</Label>
              <Input id="salon-gst" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-pan">PAN number</Label>
              <Input id="salon-pan" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
            {busy ? "Submitting…" : "Submit for review"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
