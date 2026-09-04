"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// No design screen specifies where a theme switch lives — light_mode_all_pages.jpeg
// shows every screen fully re-skinned, not a toggle control itself. Placed in the
// shell's top bar (see app/(tabs)/layout.tsx) as the most discoverable, always-on
// spot until a design says otherwise. resolvedTheme (not theme) drives the icon so
// "system" still shows the theme actually in effect.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoids a hydration mismatch: next-themes only knows the real theme after
  // mount (it reads localStorage/media query client-side).
  useEffect(() => setMounted(true), []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      className="rounded-full"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
