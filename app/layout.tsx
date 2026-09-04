import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AccountProvider } from "@/hooks/account-context";
import { BookingDraftProvider } from "@/hooks/booking-draft-context";

// Self-hosted via next/font instead of the old @import url(fonts.googleapis.com...)
// in globals.css. Playfair Display was dropped: the real designs (docs/designs/)
// use a plain UI sans-serif everywhere, and the "SALONJAA" wordmark is a logo
// graphic, not live text set in a display serif.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = { title: "Salonjaa", description: "Your personal beauty space" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is next-themes' documented requirement: it
    // sets the resolved theme's class on <html> before React hydrates, which
    // would otherwise flag as a server/client mismatch.
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AccountProvider>
            <BookingDraftProvider>{children}</BookingDraftProvider>
          </AccountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
