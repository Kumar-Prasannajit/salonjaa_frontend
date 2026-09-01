"use client";

import { useState } from "react";
import { ProfileMenu } from "@/components/profile-menu";
import { AddressList } from "@/components/address-list";
import { AddressFormDialog } from "@/components/address-form-dialog";
import type { UseAccountReturn } from "@/hooks/use-account";

// Owns which of the two in-scope authenticated screens is showing.
// The design (docs/designs/11-user-profile.jpeg) shows "Saved Addresses"
// as navigating to a separate screen; there's no router in this refactor's
// scope, so it's a local view swap instead — same two screens, no URL change.
export function AccountDashboard(account: UseAccountReturn) {
  const [view, setView] = useState<"menu" | "addresses">("menu");

  return (
    <>
      {view === "menu" ? (
        <ProfileMenu
          user={account.user}
          initials={account.initials}
          editProfile={account.editProfile}
          setEditProfile={account.setEditProfile}
          profile={account.profile}
          setProfile={account.setProfile}
          saveProfile={account.saveProfile}
          busy={account.busy}
          error={account.error}
          notice={account.notice}
          signOut={account.signOut}
          onOpenAddresses={() => setView("addresses")}
        />
      ) : (
        <AddressList
          addresses={account.addresses}
          beginAddress={account.beginAddress}
          removeAddress={account.removeAddress}
          error={account.error}
          notice={account.notice}
          onBack={() => setView("menu")}
        />
      )}

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
