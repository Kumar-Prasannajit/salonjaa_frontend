"use client";

import { ArrowLeft, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UseAccountReturn } from "@/hooks/use-account";

// No design screen exists for this one — docs/designs/11-user-profile.jpeg
// only shows "Saved Addresses" as a menu row, with no drill-down screen
// provided. Extrapolated from the same card-list language the Bookings
// (#12) and Profile (#11) screens use: bordered charcoal cards, gold
// accent for the default badge, ghost icon-buttons for edit/remove.
type AddressListProps = Pick<UseAccountReturn, "addresses" | "beginAddress" | "removeAddress" | "error" | "notice"> & {
  onBack: () => void;
};

export function AddressList({ addresses, beginAddress, removeAddress, error, notice, onBack }: AddressListProps) {
  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back to profile" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Saved Addresses</h1>
        <Button size="icon" className="rounded-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground" onClick={() => beginAddress()}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert className="border-success/40 text-success [&_svg]:text-success">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        {addresses.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <MapPinned className="size-8 text-accent" />
            <p className="font-semibold">No saved places</p>
            <p className="text-sm text-muted-foreground">Add an address to make future appointments effortless.</p>
            <Button onClick={() => beginAddress()} className="bg-gradient-to-r from-gold to-gold-bright text-primary-foreground">
              Add an address
            </Button>
          </Card>
        ) : (
          addresses.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.label || "Address"}</p>
                    {a.isDefault && (
                      <Badge className="bg-gold/20 text-primary hover:bg-gold/20">Default</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {a.addressLine1}
                    {a.addressLine2 && `, ${a.addressLine2}`}
                    <br />
                    {a.city}, {a.state} {a.postalCode}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => beginAddress(a)}
                    aria-label="Edit address"
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAddress(a.id)}
                    aria-label="Remove address"
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
