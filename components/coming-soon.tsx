import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

// Shared empty-state shell for tabs whose backend contract isn't ready yet
// (see frontend/CLAUDE.md's Scope section) — same "don't wire fake data or
// invented endpoints" rule profile-menu.tsx's disabled rows already follow,
// just full-page instead of a disabled nav row.
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Card className="flex size-16 items-center justify-center rounded-2xl border-primary/40 bg-card/60">
        <Icon className="size-7 text-primary" strokeWidth={1.5} />
      </Card>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
    </main>
  );
}
