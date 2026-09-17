"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Search, Tag, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Desktop/tablet counterpart to components/bottom-nav.tsx — same 5
// destinations, same active-state logic, laid out as an inline header nav
// instead of a bottom tab bar. Hidden below `md` (BottomNav takes over);
// hidden above `md` in the other direction via BottomNav's own `md:hidden`.
const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/offers", label: "Offers", icon: Tag },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
