"use client";

import { Building2, BadgePercent, Calendar } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { DashboardShell } from "@/components/dashboard-shell";

const NAV_ITEMS = [
  { href: "/owner/salons", label: "Salons", icon: Building2 },
  { href: "/owner/bookings", label: "Bookings", icon: Calendar },
  { href: "/owner/promotions", label: "Promotions", icon: BadgePercent },
];

// Gated on SALON_OWNER (see components/role-guard.tsx). No design exists for
// these screens — see the task's scope note — so this is functional,
// non-pixel-perfect UI reusing the app's existing shadcn primitives/tokens.
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="SALON_OWNER">
      <DashboardShell title="Owner Dashboard" items={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}
