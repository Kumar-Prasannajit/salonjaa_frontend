"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAccount, type UseAccountReturn } from "@/hooks/use-account";

// useAccount() used to be called once inside app/page.tsx and passed down as
// props through a single component tree (account-dashboard.tsx). Now that
// Profile and Saved Addresses are separate routes (app/(tabs)/profile,
// app/profile/addresses), and Bookings/checkout will need the same session
// state later, the hook is hoisted into a context at the root layout so every
// route can read it without prop-drilling across page boundaries.
const AccountContext = createContext<UseAccountReturn | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function useAccountContext() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccountContext must be used within AccountProvider");
  return ctx;
}
