import { RoleGuard } from "@/components/role-guard";
import { DashboardNav } from "@/components/dashboard-nav";

const NAV_ITEMS = [
  { href: "/owner/salons", label: "Salons" },
  { href: "/owner/bookings", label: "Bookings" },
  { href: "/owner/promotions", label: "Promotions" },
];

// Gated on SALON_OWNER (see components/role-guard.tsx). No design exists for
// these screens — see the task's scope note — so this is functional,
// non-pixel-perfect UI reusing the app's existing shadcn primitives/tokens.
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="SALON_OWNER">
      <div className="flex min-h-svh flex-col bg-background">
        <DashboardNav title="OWNER DASHBOARD" items={NAV_ITEMS} />
        <div className="mx-auto w-full max-w-md flex-1 px-5 py-6 md:max-w-3xl md:px-10 md:py-10">{children}</div>
      </div>
    </RoleGuard>
  );
}
