"use client";

import {
  ChevronRight,
  CreditCard,
  Gift,
  HeadphonesIcon,
  LogOut,
  MapPin,
  Settings,
  Shield,
  Store,
  Ticket,
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
// then grouped nav destinations, then a destructive logout row. The design
// shows "Edit Profile" and "Saved Addresses" as navigation targets (separate
// screens not included in the designs); here they expand in place instead,
// since there's no router in scope for this refactor.
//
// Phone and profileImage are rendered as placeholders, not fabricated data —
// GET /users/me returns both fields but PATCH /users/me only accepts
// fullName/gender/dob, so there is no way for a user to ever set either one
// today (see frontend/CLAUDE.md).
//
// 2026-09 desktop rebuild: was capped at max-w-3xl with a single narrow
// stacked list of nav rows and its own min-h-svh — read as a mobile screen
// stretched wide, not a real desktop account page. Nav destinations are now
// a tile grid (2-up at sm, matching how Amazon/Urban Company lay out "Your
// Account"), and the page uses the width TabsLayout already gives it instead
// of re-capping itself.
type ProfileMenuProps = Pick<
  UseAccountReturn,
  | "user"
  | "initials"
  | "isSalonOwner"
  | "isAdmin"
  | "editProfile"
  | "setEditProfile"
  | "profile"
  | "setProfile"
  | "saveProfile"
  | "busy"
  | "error"
  | "notice"
  | "signOut"
> & {
  onOpenAddresses: () => void;
  onOpenWallet: () => void;
  onClaimBooking: () => void;
  onOpenOwnerDashboard: () => void;
  onOpenAdminDashboard: () => void;
  onOpenPartnerPage: () => void;
};

const COMING_SOON = [{ icon: CreditCard, label: "Payment Methods" }] as const;

const COMING_SOON_SECONDARY = [
  { icon: Gift, label: "Refer & Earn" },
  { icon: HeadphonesIcon, label: "Help & Support" },
  { icon: Settings, label: "Settings" },
] as const;

export function ProfileMenu({
  user,
  initials,
  isSalonOwner,
  isAdmin,
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
  onOpenWallet,
  onClaimBooking,
  onOpenOwnerDashboard,
  onOpenAdminDashboard,
  onOpenPartnerPage,
}: ProfileMenuProps) {
  return (
    <main className="mx-auto w-full px-5 py-8 md:px-0 md:py-14">
      <h1 className="text-center font-serif text-lg font-semibold md:text-left md:text-3xl">My Account</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[280px_1fr] md:items-start">
        {/* Profile summary card: stacked header on mobile, sidebar card on desktop. */}
        <Card className="flex items-center gap-4 p-5 md:flex-col md:items-start md:gap-4 md:p-6">
          <Avatar className="size-16 border border-border md:size-20">
            <AvatarFallback className="bg-secondary text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-serif text-lg font-semibold">{user?.name || "Not added yet"}</p>
            <p className="text-sm text-muted-foreground">{user?.phone || "No phone on file"}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditProfile((v) => !v)}
            className="w-full shrink-0 md:mt-2 md:w-full"
          >
            {editProfile ? "Cancel" : "Edit Profile"}
          </Button>
        </Card>

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
                  className="sm:col-span-2 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90"
                >
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </Card>
          ) : (
            <>
              {(isSalonOwner || isAdmin) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {isSalonOwner && <NavTile icon={Store} label="Owner Dashboard" onClick={onOpenOwnerDashboard} />}
                  {isAdmin && <NavTile icon={Shield} label="Admin Dashboard" onClick={onOpenAdminDashboard} />}
                </div>
              )}

              <div>
                <p className="mb-3 text-sm font-semibold text-muted-foreground">Bookings & Payments</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <NavTile icon={MapPin} label="Saved Addresses" onClick={onOpenAddresses} />
                  {/* Module 20 — GET /wallet, now a real, live feature. */}
                  <NavTile icon={Wallet} label="My Wallet" onClick={onOpenWallet} />
                  {/* Module 23 — POST /bookings/claim, entirely new feature. */}
                  <NavTile icon={Ticket} label="Claim a Walk-in Booking" onClick={onClaimBooking} />
                  {COMING_SOON.map((item) => (
                    <NavTile key={item.label} {...item} disabled />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-muted-foreground">More</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <NavTile icon={Store} label="Become a Partner" onClick={onOpenPartnerPage} />
                  {COMING_SOON_SECONDARY.map((item) => (
                    <NavTile key={item.label} {...item} disabled />
                  ))}
                </div>
              </div>

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

function NavTile({
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
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-card"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <span className="flex-1">{label}</span>
      {disabled ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Soon</span>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}
