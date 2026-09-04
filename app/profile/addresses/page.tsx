"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccountContext } from "@/hooks/account-context";
import { AddressList } from "@/components/address-list";
import { AddressFormDialog } from "@/components/address-form-dialog";

// No design screen for this one (see address-list.tsx's own note). Lives
// outside the (tabs) route group deliberately — it's a drill-in from
// Profile, not a bottom-nav destination, so no tab bar here.
export default function AddressesPage() {
  const account = useAccountContext();
  const router = useRouter();

  // Tokens are memory-only (lib/api-client.ts) — a hard refresh, or landing
  // here directly, means isAuthenticated is false with nothing to show.
  useEffect(() => {
    if (!account.isAuthenticated) router.replace("/profile");
  }, [account.isAuthenticated, router]);

  if (!account.isAuthenticated) return null;

  return (
    <>
      <AddressList
        addresses={account.addresses}
        beginAddress={account.beginAddress}
        removeAddress={account.removeAddress}
        error={account.error}
        notice={account.notice}
        onBack={() => router.push("/profile")}
      />
      <AddressFormDialog
        addressForm={account.addressForm}
        setAddressForm={account.setAddressForm}
        editingAddress={account.editingAddress}
        setEditingAddress={account.setEditingAddress}
        saveAddress={account.saveAddress}
        busy={account.busy}
      />
    </>
  );
}
