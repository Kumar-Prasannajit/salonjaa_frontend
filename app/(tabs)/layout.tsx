import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";

// Shared chrome for the 5 bottom-nav destinations only. Drill-in screens
// (salon details, the booking flow, saved addresses, …) live outside this
// route group deliberately — none of the designs show a bottom nav on those,
// they're full-screen flows with a back arrow instead.
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-10">
        <span className="font-sans text-sm font-bold tracking-[0.14em] text-primary">SALONJAA</span>
        <ThemeToggle />
      </header>
      <div className="mx-auto w-full max-w-md flex-1 md:max-w-3xl">{children}</div>
      <BottomNav />
    </div>
  );
}
