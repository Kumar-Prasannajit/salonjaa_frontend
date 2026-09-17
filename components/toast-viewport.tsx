"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ToastItem, ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Colors map straight onto the theme's own tokens (app/globals.css) — no new
// palette introduced: success is --success (green), error is --destructive
// (red), warning reuses --primary (the brand brass), info is neutral
// card/foreground (the theme's white/black base in each mode).
const VARIANT_STYLE: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "border-success/40 text-success [&_svg]:text-success" },
  error: { icon: XCircle, className: "border-destructive/40 text-destructive [&_svg]:text-destructive" },
  warning: { icon: AlertTriangle, className: "border-primary/40 text-primary [&_svg]:text-primary" },
  info: { icon: Info, className: "border-border text-foreground [&_svg]:text-muted-foreground" },
};

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const { icon: Icon, className } = VARIANT_STYLE[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-top-2 duration-200",
              className
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1 text-card-foreground">{t.message}</p>
            <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
