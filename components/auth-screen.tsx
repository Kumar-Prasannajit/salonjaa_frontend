"use client";

import { FormEvent } from "react";
import { CalendarClock, Gem, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { UseAccountReturn } from "@/hooks/use-account";

// 2026-09 rebrand: splash half now uses components/logo.tsx's real crest +
// Fraunces wordmark instead of styled text with a generic Sparkles glyph.
// The form panel's visual language (bordered card, brass CTA, brass-outline
// ghost actions) carries over unchanged from the original dark/brass system.
const FEATURES = [
  { icon: MapPin, label: "Nearby Salons" },
  { icon: CalendarClock, label: "Easy Booking" },
  { icon: Gem, label: "Premium Services" },
  { icon: Lock, label: "Secure Payments" },
];

type AuthScreenProps = Pick<
  UseAccountReturn,
  | "stage"
  | "email"
  | "otp"
  | "busy"
  | "cooldown"
  | "error"
  | "notice"
  | "authLanding"
  | "setEmail"
  | "setOtp"
  | "setStage"
  | "sendOtp"
  | "verifyOtp"
  | "clearFeedback"
>;

export function AuthScreen({
  stage,
  email,
  otp,
  busy,
  cooldown,
  error,
  notice,
  authLanding,
  setEmail,
  setOtp,
  setStage,
  sendOtp,
  verifyOtp,
  clearFeedback,
}: AuthScreenProps) {
  const resend = () => sendOtp({ preventDefault: () => {} } as FormEvent);

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 12% 85%, color-mix(in srgb, var(--brass) 22%, transparent), transparent 65%)," +
            "radial-gradient(ellipse 34% 40% at 88% 10%, color-mix(in srgb, var(--brass-bright) 12%, transparent), transparent 70%)",
        }}
      />

      <div
        className={cn(
          "mx-auto grid min-h-svh w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:px-12",
          authLanding && "md:grid-cols-1"
        )}
      >
        <section
          className={cn(
            "flex flex-col items-center gap-6 text-center transition-all duration-700",
            authLanding ? "animate-in fade-in slide-in-from-bottom-4" : ""
          )}
        >
          <Logo iconClassName="size-16" textClassName="text-3xl" />
          <h1 className="max-w-sm font-serif text-3xl font-semibold leading-tight text-foreground md:text-4xl">
            Beauty, booked the way you like things done.
          </h1>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex h-24 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card/40"
              >
                <Icon className="size-6 text-accent" strokeWidth={1.5} />
                <span className="text-[11px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {!authLanding && (
          <section className="mx-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl border border-border bg-card p-8 shadow-2xl">
            <h2 className="font-serif text-3xl font-semibold">{stage === "email" ? "Let's get you glowing." : "One final step."}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {stage === "email" ? (
                "Enter your email address to receive a secure verification code."
              ) : (
                <>
                  We sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
                </>
              )}
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
              <form onSubmit={sendOtp} className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy || cooldown > 0}
                  className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90"
                >
                  {busy ? "Sending…" : cooldown ? `Try again in ${cooldown}s` : "Send verification code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    required
                    autoFocus
                    className="text-center text-xl tracking-[0.5em]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90"
                >
                  {busy ? "Verifying…" : "Verify & continue"}
                </Button>
                <div className="flex justify-between text-xs">
                  <button
                    type="button"
                    disabled={cooldown > 0 || busy}
                    onClick={resend}
                    className="text-primary underline underline-offset-2 disabled:opacity-50"
                  >
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

            <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
