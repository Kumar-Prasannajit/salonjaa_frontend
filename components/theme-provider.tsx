"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Thin wrapper so app/layout.tsx (otherwise a server component) can mount
// next-themes without itself becoming "use client". Class strategy matches
// app/globals.css's :root (light) / .dark (dark) token split.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
