import Link from "next/link";
import { Logo } from "@/components/logo";

// Desktop-only (mobile keeps BottomNav as its bottom chrome instead — a
// footer competing with a sticky tab bar for the same screen edge doesn't
// make sense there). Only real, existing routes — no fabricated social
// links, app-store badges, or legal pages that don't exist anywhere in this
// app yet.
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Discover",
    links: [
      { label: "Home", href: "/" },
      { label: "Explore Salons", href: "/explore" },
      { label: "Offers", href: "/offers" },
      { label: "My Bookings", href: "/bookings" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Profile", href: "/profile" },
      { label: "My Wallet", href: "/profile/wallet" },
      { label: "Saved Addresses", href: "/profile/addresses" },
      { label: "Claim a Walk-in Booking", href: "/bookings/claim" },
    ],
  },
  {
    title: "For Business",
    links: [{ label: "List Your Salon", href: "/partner" }],
  },
];

export function Footer() {
  return (
    <footer className="hidden border-t border-border md:block">
      <div className="mx-auto max-w-[1600px] px-10 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Beauty, booked the way you like things done — premium salons, on your time.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Book My Charm. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
