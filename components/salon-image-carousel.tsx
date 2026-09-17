"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const AUTO_SLIDE_MS = 4500;

// Salon detail page hero — combines coverImage + the owner's gallery
// (components/owner/salon-gallery-card.tsx) into one slideshow instead of
// only ever showing the single cover image. Single-image and empty cases
// render exactly as before (no dots/arrows, same placeholder).
export function SalonImageCarousel({ images, className }: { images: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % images.length) + images.length) % images.length);
    },
    [images.length]
  );

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % images.length), AUTO_SLIDE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // Restart the timer from a fresh AUTO_SLIDE_MS window whenever the slide
    // changes (including manual nav via goTo), so clicking an arrow/dot never
    // gets immediately undone by a stale auto-advance tick.
  }, [index, images.length]);

  if (images.length === 0) {
    return (
      <div className={cn("grid place-items-center bg-secondary", className)}>
        <Store className="size-10 text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={cn("group relative overflow-hidden", className)}>
      <div
        className="flex size-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- remote, salon-owner-supplied URLs; no next.config.js domain allowlist for these yet.
          <img key={src + i} src={src} alt="" className="h-full w-full shrink-0 object-cover" />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background/90 md:p-2"
          >
            <ChevronLeft className="size-4 md:size-5" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background/90 md:p-2"
          >
            <ChevronRight className="size-4 md:size-5" />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  "size-1.5 rounded-full bg-white/60 shadow-sm transition-all",
                  i === index && "w-4 bg-white"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
