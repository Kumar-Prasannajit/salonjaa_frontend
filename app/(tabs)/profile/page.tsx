"use client";

import { useRouter } from "next/navigation";
import { useAccountContext } from "@/hooks/account-context";
import { AuthScreen } from "@/components/auth-screen";
import { ProfileMenu } from "@/components/profile-menu";

// docs/designs/01-auth-screen.jpeg (signed out) and 11-user-profile.jpeg
// (signed in). Previously app/page.tsx gated the *entire* app behind auth;
// now browsing is anonymous (this session's decision) and sign-in is scoped
// to this tab plus, later, the checkout step in Module 5 — so this route is
// where AuthScreen actually lives now.
export default function ProfilePage() {
  const account = useAccountContext();
  const router = useRouter();

  if (!account.isAuthenticated || !account.user) {
    return (
      <AuthScreen
        stage={account.stage}
        email={account.email}
        otp={account.otp}
        busy={account.busy}
        cooldown={account.cooldown}
        error={account.error}
        notice={account.notice}
        authLanding={account.authLanding}
        setEmail={account.setEmail}
        setOtp={account.setOtp}
        setStage={account.setStage}
        sendOtp={account.sendOtp}
        verifyOtp={account.verifyOtp}
        clearFeedback={account.clearFeedback}
      />
    );
  }

  return (
    <ProfileMenu
      user={account.user}
      initials={account.initials}
      isSalonOwner={account.isSalonOwner}
      isAdmin={account.isAdmin}
      editProfile={account.editProfile}
      setEditProfile={account.setEditProfile}
      profile={account.profile}
      setProfile={account.setProfile}
      saveProfile={account.saveProfile}
      busy={account.busy}
      error={account.error}
      notice={account.notice}
      signOut={account.signOut}
      onOpenAddresses={() => router.push("/profile/addresses")}
      onOpenWallet={() => router.push("/profile/wallet")}
      onClaimBooking={() => router.push("/bookings/claim")}
      onOpenOwnerDashboard={() => router.push("/owner")}
      onOpenAdminDashboard={() => router.push("/admin")}
    />
  );
}
