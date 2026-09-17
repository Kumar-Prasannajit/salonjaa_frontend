import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/hooks/toast-context";
import { AccountProvider } from "@/hooks/account-context";
import { BookingDraftProvider } from "@/hooks/booking-draft-context";
import { GeolocationProvider } from "@/hooks/geolocation-context";

// 2026-09 rebrand (Salonjaa -> Book My Charm): Fraunces is the warm,
// old-style display serif carrying the brand's crest-and-crown personality
// (headings, salon/service names, prices); Plus Jakarta Sans is the UI/body
// grotesk — chosen over the earlier DM Sans / a default Inter for its
// slightly rounded terminals, which read a touch warmer without giving up
// legibility in dense dashboard tables.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Book My Charm",
  description: "Book your beautician — premium salons, on your time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is next-themes' documented requirement: it
    // sets the resolved theme's class on <html> before React hydrates, which
    // would otherwise flag as a server/client mismatch.
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ToastProvider>
            <AccountProvider>
              <GeolocationProvider>
                <BookingDraftProvider>{children}</BookingDraftProvider>
              </GeolocationProvider>
            </AccountProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
