"use client";

import { useAccount } from "@/hooks/use-account";
import { AuthScreen } from "@/components/auth-screen";
import { AccountDashboard } from "@/components/account-dashboard";

export default function Home() {
  const account = useAccount();

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

  return <AccountDashboard {...account} />;
}
