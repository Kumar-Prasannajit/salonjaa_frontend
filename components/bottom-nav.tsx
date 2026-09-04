"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Search, Tag, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Matches the bottom tab bar drawn on every one of the 12 designs (Home,
// Bookings, Explore, Offers, Profile) — light_mode_all_pages.jpeg's Home
// screen alone swaps "Offers" for a floating "+" action, but every other
// screen in both the light and dark sets uses this same 5-tab bar, so that's
// treated as the one inconsistent frame rather than the intended pattern.
const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/offers", label: "Offers", icon: Tag },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-center justify-between px-2 py-2 md:max-w-3xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
