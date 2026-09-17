import { cn } from "@/lib/utils";

// 2026-09 rebrand. The client's real mark (public/logo.png, a proper
// transparent PNG) sets its "BookMyCharm" wordmark in a fixed dark
// espresso-bronze — correct on the white background the mark was designed
// against, but illegible once placed on this app's dark theme (the default
// theme here, per app/theme-provider.tsx's defaultTheme="dark") or any of
// its dark card surfaces, neither of which is ever guaranteed white. So the
// mark used live in the app is a from-scratch vector interpretation of the
// same crest-and-crown motif (currentColor/CSS-variable driven, correct in
// both themes automatically) paired with the wordmark set as live text in
// the brand's Fraunces display face, not the raster PNG. public/logo.png is
// kept as the source brand asset for anywhere a guaranteed-white background
// is available outside this app (print, email headers, partner decks).
function CrestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="crest-brass" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--brass-bright)" />
          <stop offset="55%" stopColor="var(--brass)" />
          <stop offset="100%" stopColor="var(--brass-deep)" />
        </linearGradient>
      </defs>
      <path
        d="M14 13.5L17.5 8.5L21 12.5L24 7L27 12.5L30.5 8.5L34 13.5"
        stroke="url(#crest-brass)"
        strokeWidth="2.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="8.5" r="1.3" fill="url(#crest-brass)" />
      <circle cx="24" cy="7" r="1.3" fill="url(#crest-brass)" />
      <circle cx="30.5" cy="8.5" r="1.3" fill="url(#crest-brass)" />
      <path
        d="M9 14.5H39V26C39 34.5 32.5 40.5 24 43.5C15.5 40.5 9 34.5 9 26V14.5Z"
        stroke="url(#crest-brass)"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M27.2 20C29 20 30.4 21.6 30.4 23.6C30.4 25.4 29.3 26.7 28.6 27.5C29.6 28.4 30.6 29.9 30.6 32.1C30.6 34.7 28.8 37 26.2 38.1"
        stroke="url(#crest-brass)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M18 37.5C16.6 34.8 16 32 16 29.5C16 24.2 19.6 19.8 24.6 19.8C25.6 19.8 26.5 19.9 27.2 20"
        stroke="url(#crest-brass)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M21.5 27C21.9 26.4 22.5 26 23.2 26" stroke="url(#crest-brass)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  className,
  iconClassName,
  textClassName,
  iconOnly = false,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  iconOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CrestIcon className={cn("size-6 shrink-0", iconClassName)} />
      {!iconOnly && (
        <span className={cn("font-serif text-lg font-semibold tracking-tight text-foreground", textClassName)}>
          Book<span className="text-brass">My</span>Charm
        </span>
      )}
    </span>
  );
}
