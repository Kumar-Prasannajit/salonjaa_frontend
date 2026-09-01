"use client";

import {
  ChevronRight,
  CreditCard,
  Gift,
  HeadphonesIcon,
  LogOut,
  MapPin,
  Settings,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UseAccountReturn } from "@/hooks/use-account";

// Matches docs/designs/11-user-profile.jpeg: avatar + name/phone header,
// then two grouped nav-row cards, then a destructive logout row. The design
// shows "Edit Profile" and "Saved Addresses" as navigation targets (separate
// screens not included in the designs); here they expand in place instead,
// since there's no router in scope for this refactor.
//
// Phone and profileImage are rendered as placeholders, not fabricated data —
// GET /users/me returns both fields but PATCH /users/me only accepts
// fullName/gender/dob, so there is no way for a user to ever set either one
// today (see frontend/CLAUDE.md).
type ProfileMenuProps = Pick<
  UseAccountReturn,
  "user" | "initials" | "editProfile" | "setEditProfile" | "profile" | "setProfile" | "saveProfile" | "busy" | "error" | "notice" | "signOut"
> & { onOpenAddresses: () => void };

const COMING_SOON = [
  { icon: Wallet, label: "My Wallet" },
  { icon: CreditCard, label: "Payment Methods" },
] as const;

const COMING_SOON_SECONDARY = [
  { icon: Gift, label: "Refer & Earn" },
  { icon: HeadphonesIcon, label: "Help & Support" },
  { icon: Settings, label: "Settings" },
] as const;

export function ProfileMenu({
  user,
  initials,
  editProfile,
  setEditProfile,
  profile,
  setProfile,
  saveProfile,
  busy,
  error,
  notice,
  signOut,
  onOpenAddresses,
}: ProfileMenuProps) {
  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-3xl md:px-10 md:py-12">
      <h1 className="text-center text-lg font-semibold md:text-left md:text-2xl">Profile</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr] md:items-start">
        {/* Sidebar on desktop, stacked header on mobile — same content either way. */}
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3">
          <Avatar className="size-16 border border-border md:size-20">
            <AvatarFallback className="bg-secondary text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{user?.name || "Not added yet"}</p>
            <p className="text-sm text-muted-foreground">{user?.phone || "No phone on file"}</p>
            <button
              type="button"
              onClick={() => setEditProfile((v) => !v)}
              className="mt-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {editProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
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

          {editProfile ? (
            <Card className="p-5">
              <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
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
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={profile.dob}
                    onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="sm:col-span-2 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90"
                >
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </Card>
          ) : (
            <>
              <Card className="divide-y divide-border overflow-hidden p-0">
                <NavRow icon={MapPin} label="Saved Addresses" onClick={onOpenAddresses} />
                {COMING_SOON.map((item) => (
                  <NavRow key={item.label} {...item} disabled />
                ))}
              </Card>

              <Card className="divide-y divide-border overflow-hidden p-0">
                {COMING_SOON_SECONDARY.map((item) => (
                  <NavRow key={item.label} {...item} disabled />
                ))}
              </Card>

              <Card className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function NavRow({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof MapPin;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {disabled ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Coming soon</span>
      ) : (
        <ChevronRight className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}
