"use client";

import { FormEvent, useState } from "react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { Branch } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// PATCH /branches/:id — branch.validator.ts's updateBranchSchema (every field
// optional, opening-before-closing still enforced). No DELETE endpoint exists
// for a branch (frontend_handover.md only documents POST/GET/GET/PATCH), so
// there's deliberately no delete action here.
export function BranchInfoCard({ branch, onUpdated }: { branch: Branch; onUpdated: (b: Branch) => void }) {
  const toast = useToastContext();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: branch.name,
    phone: branch.phone || "",
    email: branch.email || "",
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2 || "",
    city: branch.city,
    state: branch.state,
    postalCode: branch.postalCode,
    totalChairs: String(branch.totalChairs),
    openingTime: branch.openingTime,
    closingTime: branch.closingTime,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        totalChairs: Number(form.totalChairs),
        openingTime: form.openingTime,
        closingTime: form.closingTime,
      };
      const result = await apiFetch<{ data: Branch }>(`/branches/${branch.id}`, { method: "PATCH", body: JSON.stringify(body) });
      onUpdated(result.data);
      setEditing(false);
      toast.success("Branch updated.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{branch.name}</h2>
          <Badge variant="outline">{branch.status}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
          {error && (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="b-name">Name</Label>
            <Input id="b-name" required value={form.name} onChange={set("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-phone">Phone</Label>
            <Input id="b-phone" value={form.phone} onChange={set("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-email">Email</Label>
            <Input id="b-email" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="b-addr1">Address line 1</Label>
            <Input id="b-addr1" required value={form.addressLine1} onChange={set("addressLine1")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="b-addr2">Address line 2</Label>
            <Input id="b-addr2" value={form.addressLine2} onChange={set("addressLine2")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-city">City</Label>
            <Input id="b-city" required value={form.city} onChange={set("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-state">State</Label>
            <Input id="b-state" required value={form.state} onChange={set("state")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-postal">Postal code</Label>
            <Input id="b-postal" required value={form.postalCode} onChange={set("postalCode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-chairs">Total chairs</Label>
            <Input id="b-chairs" type="number" min="1" required value={form.totalChairs} onChange={set("totalChairs")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-open">Opens</Label>
            <Input id="b-open" type="time" required value={form.openingTime} onChange={set("openingTime")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-close">Closes</Label>
            <Input id="b-close" type="time" required value={form.closingTime} onChange={set("closingTime")} />
          </div>
          <Button type="submit" disabled={busy} className="sm:col-span-2 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>
      ) : (
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>
            {branch.addressLine1}
            {branch.addressLine2 ? `, ${branch.addressLine2}` : ""}, {branch.city}, {branch.state} {branch.postalCode}
          </p>
          <p>{branch.phone || "No phone on file"}</p>
          <p>
            {branch.totalChairs} chairs • {branch.openingTime}–{branch.closingTime}
          </p>
        </div>
      )}
    </Card>
  );
}
