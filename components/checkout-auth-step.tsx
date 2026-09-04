"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UseAccountReturn } from "@/hooks/use-account";

// Auth is deferred to checkout (this session's decision — see CLAUDE.md):
// browsing through Choose Slot is anonymous, so this is the first point a
// customer signs in. Same email/OTP logic as components/auth-screen.tsx
// (both read from the same useAccountContext instance) but a compact inline
// card instead of the full splash — the "Nearby Salons/Easy Booking/..."
// feature grid doesn't belong mid-checkout.
type CheckoutAuthStepProps = Pick<
  UseAccountReturn,
  "stage" | "email" | "otp" | "busy" | "cooldown" | "error" | "notice" | "setEmail" | "setOtp" | "setStage" | "sendOtp" | "verifyOtp" | "clearFeedback"
>;

export function CheckoutAuthStep({
  stage,
  email,
  otp,
  busy,
  cooldown,
  error,
  notice,
  setEmail,
  setOtp,
  setStage,
  sendOtp,
  verifyOtp,
  clearFeedback,
}: CheckoutAuthStepProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Lock className="size-4" />
        SIGN IN TO CONTINUE
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {stage === "email" ? "We need your email to confirm this booking." : `Enter the code we sent to ${email}.`}
      </p>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="mt-4 border-success/40 text-success [&_svg]:text-success">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {stage === "email" ? (
        <form onSubmit={sendOtp} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkout-email">Email address</Label>
            <Input id="checkout-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy || cooldown > 0} className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
            {busy ? "Sending…" : cooldown ? `Try again in ${cooldown}s` : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkout-otp">Verification code</Label>
            <Input
              id="checkout-otp"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • • • •"
              className="text-center text-lg tracking-[0.4em]"
            />
          </div>
          <Button type="submit" disabled={busy || otp.length !== 6} className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
            {busy ? "Verifying…" : "Verify & continue"}
          </Button>
          <div className="flex justify-between text-xs">
            <button type="button" disabled={cooldown > 0 || busy} onClick={() => sendOtp({ preventDefault: () => {} } as never)} className="text-primary underline underline-offset-2 disabled:opacity-50">
              {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("email");
                clearFeedback();
              }}
              className="text-primary underline underline-offset-2"
            >
              Use another email
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
