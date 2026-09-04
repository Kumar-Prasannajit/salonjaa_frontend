"use client";

import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UseAccountReturn } from "@/hooks/use-account";

// Runs once, right after sign-in, only when GET /users/me came back with no
// name (a brand-new account) — per this session's decision. Reuses
// account.profile/saveProfile (PATCH /users/me) exactly like profile-menu.tsx's
// edit form; the checkout page itself decides when to show this step by
// checking `!user?.name`, so no local "done" state is needed here.
type CheckoutBasicDetailsStepProps = Pick<UseAccountReturn, "profile" | "setProfile" | "saveProfile" | "busy" | "error">;

export function CheckoutBasicDetailsStep({ profile, setProfile, saveProfile, busy, error }: CheckoutBasicDetailsStepProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <UserRound className="size-4" />
        JUST ONE MORE THING
      </div>
      <p className="mt-2 text-sm text-muted-foreground">A few basic details so the salon knows who to expect.</p>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={saveProfile} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="checkout-fullName">Full name</Label>
          <Input
            id="checkout-fullName"
            required
            autoFocus
            value={profile.fullName}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkout-gender">Gender</Label>
            <select
              id="checkout-gender"
              value={profile.gender}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout-dob">Date of birth</Label>
            <Input
              id="checkout-dob"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={profile.dob}
              onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
          {busy ? "Saving…" : "Continue"}
        </Button>
      </form>
    </Card>
  );
}
