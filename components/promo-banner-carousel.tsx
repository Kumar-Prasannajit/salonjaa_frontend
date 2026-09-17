"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicPromotion } from "@/lib/types";

const AUTO_SLIDE_MS = 5000;

// Full-width homepage banner strip — real, currently-active promotions from
// GET /public/promotions (no branchId = every salon's, not just one), same
// dot/arrow/auto-slide interaction as components/salon-image-carousel.tsx.
// Only promotions with a real bannerImageUrl are shown here (a promo with no
// image renders fine elsewhere, e.g. a salon's own detail page list — this
// section specifically needs a photo to be worth a full-width slot).
export function PromoBannerCarousel({ promotions }: { promotions: PublicPromotion[] }) {
  const slides = promotions.filter((p) => p.bannerImageUrl);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_SLIDE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative mt-10 overflow-hidden rounded-2xl">
      <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((p) => (
          <div key={p.id} className="relative h-48 w-full shrink-0 md:h-64 lg:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote, owner-supplied banner image. */}
            <img src={p.bannerImageUrl!} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
              <h3 className="font-serif text-xl font-semibold text-white md:text-2xl">{p.title}</h3>
              {p.description && <p className="mt-1 max-w-xl text-sm text-white/85 md:text-base">{p.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous offer"
            onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background/90 md:p-2"
          >
            <ChevronLeft className="size-4 md:size-5" />
          </button>
          <button
            type="button"
            aria-label="Next offer"
            onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background/90 md:p-2"
          >
            <ChevronRight className="size-4 md:size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to offer ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn("size-1.5 rounded-full bg-white/60 shadow-sm transition-all", i === index && "w-4 bg-white")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
