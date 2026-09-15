"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, WalletIcon } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import type { Wallet, WalletTransaction } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoleGuard } from "@/components/role-guard";

const REASON_LABEL: Record<WalletTransaction["reason"], string> = {
  BOOKING_PAYMENT: "Booking Payment",
  BOOKING_REFUND: "Booking Refund",
  REFUND_APPROVED: "Refund Approved",
  ADVANCE_FORFEITURE: "Advance Forfeited",
};

// GET /wallet, GET /wallet/transactions (Module 20) — no design mockup
// exists, entirely new feature. A stored-balance wallet funded only by
// admin-approved refunds and Module 16 strikes-policy advance-forfeitures
// (both automatic — no top-up endpoint anywhere), spendable in full as a
// WALLET payment method at Checkout. No withdrawal, no expiry. No tab bar
// (drill-in from Profile, not a bottom-nav destination), redirects to
// /profile if signed out, same pattern as app/profile/addresses/page.tsx.
//
// BUG-002 fix — GET /wallet is CUSTOMER-only (requireRole(CUSTOMER)); signed in with any other
// role (or signed out) used to render its raw "Requires one of roles: CUSTOMER" 403 body
// straight into the Alert below. Wrapped in RoleGuard now, same access-denied/sign-in-required
// treatment app/owner and app/admin already get — WalletContent (and its /wallet fetch) only
// ever mounts once the CUSTOMER check has passed, so that 403 can't happen through normal
// navigation any more.
export default function WalletPage() {
  return (
    <RoleGuard role="CUSTOMER">
      <WalletContent />
    </RoleGuard>
  );
}

function WalletContent() {
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([apiFetch<{ data: Wallet }>("/wallet"), apiFetch<{ data: WalletTransaction[] }>("/wallet/transactions")])
      .then(([walletResult, txResult]) => {
        setWallet(walletResult.data);
        setTransactions(txResult.data);
      })
      .catch((e) => setError(messageFromError(e)));
  }, []);

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/profile")} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">My Wallet</h1>
        <div className="size-8" />
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <Card className="mt-6 flex flex-col items-center gap-2 bg-gradient-to-r from-gold to-gold-bright p-6 text-center text-primary-foreground">
          <WalletIcon className="size-6" strokeWidth={1.5} />
          {wallet ? (
            <p className="text-3xl font-bold">₹{wallet.balance}</p>
          ) : (
            <Skeleton className="h-9 w-24 bg-primary-foreground/30" />
          )}
          <p className="text-xs opacity-90">Available balance</p>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        <h2 className="font-semibold">Transaction History</h2>

        {!error && transactions === null && (
          <>
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </>
        )}

        {transactions !== null && transactions.length === 0 && (
          <p className="text-sm text-muted-foreground">No wallet activity yet — a refund or forfeiture credit will show up here.</p>
        )}

        {transactions?.map((tx) => (
          <Card key={tx.id} className="flex-row items-center gap-3 p-3">
            <div className={`grid size-9 shrink-0 place-items-center rounded-full ${tx.type === "CREDIT" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
              {tx.type === "CREDIT" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tx.description || REASON_LABEL[tx.reason]}</p>
              <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${tx.type === "CREDIT" ? "text-success" : "text-destructive"}`}>
                {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount}
              </p>
              <p className="text-xs text-muted-foreground">Bal. ₹{tx.balanceAfter}</p>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
