"use client";

import { Building2, Receipt, MessageSquareWarning, BarChart3, Tag, Ticket, Banknote, ShieldAlert } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { DashboardShell } from "@/components/dashboard-shell";

const NAV_ITEMS = [
  { href: "/admin/salons", label: "Salons", icon: Building2 },
  { href: "/admin/refunds", label: "Refunds", icon: Receipt },
  { href: "/admin/complaints", label: "Complaints", icon: MessageSquareWarning },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/settlements", label: "Settlements", icon: Banknote },
  { href: "/admin/strikes", label: "Strikes", icon: ShieldAlert },
];

// Gated on ADMIN (see components/role-guard.tsx). Covers every Admin
// surface `frontend_handover.md` documents as 🟢 Live — the original 4
// docs/ADMIN_CONTRACT.md surfaces (Salons/Refunds/Complaints/Reports) plus
// Categories/Coupons/Settlements/Strikes (BUG-013 fix — these were fully
// built on the backend and the doc already said "nothing outstanding on
// the Admin surface", but no frontend screens existed for them at all;
// this comment previously and incorrectly claimed the backend hadn't
// built them either).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="ADMIN">
      <DashboardShell title="Admin Dashboard" items={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}
