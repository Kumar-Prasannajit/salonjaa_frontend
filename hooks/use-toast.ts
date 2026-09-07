"use client";

import { useCallback, useRef, useState } from "react";

// Global feedback for one-off action outcomes (save/delete/approve/reject/…)
// — a fixed-position toast is guaranteed visible regardless of scroll
// position, unlike an inline <Alert> that can render off the bottom of a
// long form (e.g. app/owner/bookings/walk-in/page.tsx's error sits above a
// tall SlotPicker — exactly how the "Selected staff is no longer available"
// 409 was going unnoticed). Existing inline error/notice state throughout
// the app is left in place; toasts are additive, not a replacement.
export type ToastVariant = "success" | "error" | "warning" | "info";
export type ToastItem = { id: number; variant: ToastVariant; message: string };

const DEFAULT_DURATION_MS = 4500;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string, durationMs = DEFAULT_DURATION_MS) => {
      const id = nextId.current++;
      setToasts((all) => [...all, { id, variant, message }]);
      window.setTimeout(() => dismiss(id), durationMs);
      return id;
    },
    [dismiss]
  );

  return {
    toasts,
    dismiss,
    success: (message: string) => push("success", message),
    error: (message: string) => push("error", message),
    warning: (message: string) => push("warning", message),
    info: (message: string) => push("info", message),
  };
}

export type UseToastReturn = ReturnType<typeof useToast>;
