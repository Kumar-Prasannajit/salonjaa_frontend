"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared 1-5 star input, used for the overall rating and each of the 5
// review.validator.ts category ratings. `size="sm"` for the compact
// read-only display in reviews-listing.
export function StarRating({
  value,
  onChange,
  size = "default",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "default" | "sm";
}) {
  const starSize = size === "sm" ? "size-4" : "size-6";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={cn(!onChange && "cursor-default")}
        >
          <Star className={cn(starSize, n <= value ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}
