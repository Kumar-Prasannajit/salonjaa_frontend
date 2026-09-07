import { RoleGuard } from "@/components/role-guard";
import { DashboardNav } from "@/components/dashboard-nav";

const NAV_ITEMS = [
  { href: "/admin/salons", label: "Salons" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/reports", label: "Reports" },
];

// Gated on ADMIN (see components/role-guard.tsx). Covers exactly the 4
// docs/ADMIN_CONTRACT.md surfaces that are 🟢 Live per frontend_handover.md —
// everything else in that doc is explicitly "not built" (settlement
// creation, coupon/category CRUD, customer strikes).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="ADMIN">
      <div className="flex min-h-svh flex-col bg-background">
        <DashboardNav title="ADMIN DASHBOARD" items={NAV_ITEMS} />
        <div className="mx-auto w-full max-w-md flex-1 px-5 py-6 md:max-w-3xl md:px-10 md:py-10">{children}</div>
      </div>
    </RoleGuard>
  );
}
