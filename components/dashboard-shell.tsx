"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export type DashboardNavItem = { href: string; label: string; icon: LucideIcon };

// Shared chrome for app/owner/* and app/admin/*. No design exists for these
// screens (docs/designs/ only covers the 12 customer screens), so this is
// functional, non-pixel-perfect UI built against the app's own tokens.
//
// 2026-09 responsive rebuild: below `lg` this is the original pattern — a
// sticky top bar (back arrow, wordmark, theme toggle) with a horizontal
// pill-nav row underneath. At `lg` and up, that collapses into a persistent
// left sidebar (the pattern an actual daily-use dashboard needs — a pill
// strip stretched across a 1440px screen was never a real desktop layout).
// The sidebar footer already holds ThemeToggle, so no separate desktop
// top bar is needed — that would be pure duplication.
export function DashboardShell({ title, items, children }: { title: string; items: DashboardNavItem[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="lg:flex lg:min-h-svh">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-card/40">
        <div className="flex items-center gap-2 px-6 py-6">
          <Logo iconOnly className="size-7" />
          <div>
            <p className="font-serif text-base font-semibold leading-tight">Book My Charm</p>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">{title}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-gradient-to-r from-brass to-brass-bright text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="size-4.5" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button type="button" onClick={() => router.push("/profile")} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Back to Profile
          </button>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col lg:min-h-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-10">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.push("/profile")} aria-label="Back to Profile" className="rounded-full border border-border p-2">
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-sm font-bold tracking-[0.1em] text-primary">{title}</span>
            </div>
            <ThemeToggle />
          </div>
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-3 md:px-10">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-gradient-to-r from-brass to-brass-bright text-primary-foreground" : "border border-border text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6 md:px-10 md:py-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
