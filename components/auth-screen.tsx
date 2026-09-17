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

// 2026-09 desktop rebuild: this used to be a small centered card floating in
// an oversized min-h-svh void, which read as a mobile screen stretched into
// a desktop browser rather than a real desktop page. Now it's one unified
// split panel (brand half + form half) sized to the space TabsLayout's flex
// column actually gives it, so it reads as a page section, not an orphaned
// phone screenshot. authLanding still gates the intro-only (brand-panel-only)
// moment before the form half slides in, same behavior as before.
const FEATURES = [
  { icon: MapPin, label: "Nearby Salons", detail: "Discover top-rated salons around you" },
  { icon: CalendarClock, label: "Easy Booking", detail: "Pick a service, stylist, and slot in minutes" },
  { icon: Gem, label: "Premium Services", detail: "Curated treatments from vetted professionals" },
  { icon: Lock, label: "Secure Payments", detail: "Pay online, or at the salon — your choice" },
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
    <main className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center bg-background py-10 md:py-16">
      <div
        className={cn(
          "mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl transition-all duration-700 md:grid-cols-2",
          authLanding && "md:grid-cols-1"
        )}
      >
        <section
          className={cn(
            "relative flex flex-col justify-between gap-10 overflow-hidden p-8 transition-all duration-700 md:p-14",
            authLanding ? "animate-in fade-in items-center text-center" : "items-start text-left"
          )}
          style={{
            background:
              "linear-gradient(155deg, color-mix(in srgb, var(--brass) 10%, var(--card)) 0%, var(--card) 55%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--brass-bright), transparent 70%)" }}
          />

          <Logo iconClassName="size-10" textClassName="text-2xl" />

          <h1
            className={cn(
              "font-serif font-semibold leading-[1.15] text-foreground",
              authLanding ? "max-w-lg text-3xl md:text-5xl" : "max-w-sm text-3xl md:text-4xl"
            )}
          >
            Beauty, booked the way you like things done.
          </h1>

          <ul className={cn("w-full space-y-5", authLanding ? "max-w-sm" : "")}>
            {FEATURES.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex items-start gap-3.5 text-left">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background/60">
                  <Icon className="size-4.5 text-accent" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {!authLanding && (
          <section className="flex animate-in fade-in slide-in-from-right-4 flex-col justify-center border-t border-border p-8 duration-500 md:border-l md:border-t-0 md:p-14">
            <h2 className="font-serif text-2xl font-semibold md:text-3xl">{stage === "email" ? "Let's get you glowing." : "One final step."}</h2>
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
