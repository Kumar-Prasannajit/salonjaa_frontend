"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useToast, type UseToastReturn } from "@/hooks/use-toast";
import { ToastViewport } from "@/components/toast-viewport";

// Same hoisted-hook-into-context pattern as hooks/account-context.tsx —
// mounted once at the root layout so every route can fire a toast without
// prop-drilling.
const ToastContext = createContext<UseToastReturn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used within ToastProvider");
  return ctx;
}
