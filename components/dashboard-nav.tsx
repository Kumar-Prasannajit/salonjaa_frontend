"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

// Shared chrome for app/owner/* and app/admin/* — no design exists for these
// (docs/designs/ only covers the 12 customer screens, per the task's scope
// note), so this borrows the (tabs) layout's header conventions (sticky bar,
// SALONJAA wordmark, ThemeToggle) rather than inventing a new visual language,
// plus a back arrow (these routes have no bottom nav, same as every other
// drill-in screen) and a horizontal section-switcher instead of a sidebar.
export function DashboardNav({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3 md:max-w-3xl md:px-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/profile")} aria-label="Back to Profile" className="rounded-full border border-border p-2">
            <ArrowLeft className="size-4" />
          </button>
          <span className="text-sm font-bold tracking-[0.1em] text-primary">{title}</span>
        </div>
        <ThemeToggle />
      </div>
      <nav className="mx-auto flex max-w-md gap-1 overflow-x-auto px-5 pb-3 md:max-w-3xl md:px-10">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-gradient-to-r from-gold to-gold-bright text-primary-foreground" : "border border-border text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
