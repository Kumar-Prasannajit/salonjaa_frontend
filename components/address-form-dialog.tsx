"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseAccountReturn } from "@/hooks/use-account";

type AddressFormDialogProps = Pick<
  UseAccountReturn,
  "addressForm" | "setAddressForm" | "editingAddress" | "setEditingAddress" | "saveAddress" | "busy"
>;

export function AddressFormDialog({
  addressForm,
  setAddressForm,
  editingAddress,
  setEditingAddress,
  saveAddress,
  busy,
}: AddressFormDialogProps) {
  const close = () => {
    setAddressForm(null);
    setEditingAddress(null);
  };

  if (!addressForm) return null;

  return (
    <Dialog open={!!addressForm} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingAddress ? "Edit address" : "Add an address"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={saveAddress} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={addressForm.label}
              onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
              placeholder="Home"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input
              id="addressLine1"
              required
              value={addressForm.addressLine1}
              onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input
              id="addressLine2"
              value={addressForm.addressLine2}
              onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" required value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" required value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              required
              value={addressForm.postalCode}
              onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">
              Latitude <small className="text-muted-foreground">(optional)</small>
            </Label>
            <Input
              id="latitude"
              inputMode="decimal"
              value={addressForm.latitude}
              onChange={(e) => setAddressForm({ ...addressForm, latitude: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="longitude">
              Longitude <small className="text-muted-foreground">(optional)</small>
            </Label>
            <Input
              id="longitude"
              inputMode="decimal"
              value={addressForm.longitude}
              onChange={(e) => setAddressForm({ ...addressForm, longitude: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
              className="size-4 rounded border-input"
            />
            Make this my default address
          </label>
          <Button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90"
          >
            {busy ? "Saving…" : "Save address"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
