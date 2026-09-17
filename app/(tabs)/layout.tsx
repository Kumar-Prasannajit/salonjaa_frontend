import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopNav } from "@/components/desktop-nav";

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
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 md:px-10">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <DesktopNav />
          <ThemeToggle />
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 md:px-6">{children}</div>
      <BottomNav />
    </div>
  );
}
