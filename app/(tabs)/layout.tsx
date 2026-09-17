import Link from "next/link";
import { Store } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopNav } from "@/components/desktop-nav";
import { HeaderLocationSearch } from "@/components/header-location-search";
import { Footer } from "@/components/footer";

// Shared chrome for the 5 bottom-nav destinations only. Drill-in screens
// (salon details, the booking flow, saved addresses, …) live outside this
// route group deliberately — none of the designs show a bottom nav on those,
// they're full-screen flows with a back arrow instead.
//
// 2026-09 responsive rebuild: below `md` this still behaves like the
// original mobile-only shell (BottomNav visible, narrow centered column).
// At `md` and up, BottomNav hides and DesktopNav takes over as an inline
// header nav, and the content column widens to a real desktop max-width
// instead of just stretching the phone-width column — see each page's own
// responsive grid for how it uses that extra room.
//
// 2026-09 header split: logo/location/search/partner/theme + the 5 nav
// destinations were all crammed into one row once location+search+partner
// joined it — split into a slim utility row and its own nav row underneath
// (same two-tier pattern as most e-commerce headers) instead of shrinking
// everything to fit one line.
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3 md:px-10">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <HeaderLocationSearch />
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/partner"
              className="hidden items-center gap-1.5 rounded-full border border-primary/40 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 md:inline-flex"
            >
              <Store className="size-3.5" />
              Become a Partner
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <div className="hidden border-t border-border/60 md:block">
          <div className="mx-auto flex max-w-[1600px] justify-center px-5 py-1.5 md:px-10">
            <DesktopNav />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1600px] flex-1 md:px-6">{children}</div>
      <Footer />
      <BottomNav />
    </div>
  );
}
