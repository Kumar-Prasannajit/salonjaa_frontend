"use client";

import { useRouter } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountContext } from "@/hooks/account-context";

// Route-level protection for app/owner/*, app/admin/*, and (BUG-002 fix)
// app/profile/wallet — the "Owner Dashboard"/"Admin Dashboard" links in the
// Profile menu only render when the decoded role is present, but that's UI
// convenience, not security: this is the actual gate, checked on every
// render of the protected layout, same as how /bookings already nudges a
// signed-out visitor rather than 404ing.
export function RoleGuard({ role, children }: { role: "SALON_OWNER" | "ADMIN" | "CUSTOMER"; children: React.ReactNode }) {
  const account = useAccountContext();
  const router = useRouter();
  const roleLabel = role === "SALON_OWNER" ? "Salon Owner" : role === "ADMIN" ? "Admin" : "Customer";
  const destination = role === "CUSTOMER" ? "this page" : "this dashboard";

  // BUG-014 fix: a hard refresh starts with isAuthenticated false until the
  // mount-time cookie-restore in useAccount finishes (same race already
  // handled by app/profile/addresses and app/bookings/claim). Wait for
  // authChecked before deciding, so a genuinely still-signed-in admin/owner
  // doesn't see a false "Sign in required" flash on every page load.
  if (!account.authChecked) {
    return null;
  }

  if (!account.isAuthenticated) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <Card className="flex size-16 items-center justify-center rounded-2xl border-primary/40 bg-card/60">
          <Lock className="size-7 text-primary" strokeWidth={1.5} />
        </Card>
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Sign in with an account that has {roleLabel} access to open {destination}.
        </p>
        <Button className="bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90" onClick={() => router.push("/profile")}>
          Go to Profile to sign in
        </Button>
      </main>
    );
  }

  const hasRole = role === "SALON_OWNER" ? account.isSalonOwner : role === "ADMIN" ? account.isAdmin : account.isCustomer;
  if (!hasRole) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <Card className="flex size-16 items-center justify-center rounded-2xl border-destructive/40 bg-card/60">
          <ShieldAlert className="size-7 text-destructive" strokeWidth={1.5} />
        </Card>
        <h1 className="text-xl font-semibold">You don&apos;t have access</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          This account doesn&apos;t have {roleLabel} access. Roles are granted manually — ask whoever manages your account access.
        </p>
        <Button variant="outline" onClick={() => router.push("/profile")}>
          Back to Profile
        </Button>
      </main>
    );
  }

  return <>{children}</>;
}
