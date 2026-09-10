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

  // A hard refresh (or landing here directly) starts with isAuthenticated
  // false until the mount-time cookie-restore in useAccount finishes —
  // gating on authChecked too avoids bouncing an actually-still-signed-in
  // visitor back to /profile before that restore had a chance to resolve.
  useEffect(() => {
    if (account.authChecked && !account.isAuthenticated) router.replace("/profile");
  }, [account.authChecked, account.isAuthenticated, router]);

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
