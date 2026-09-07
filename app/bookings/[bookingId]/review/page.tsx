"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { apiFetch, ApiError, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { BookingDetail, Review, ReviewRatings } from "@/lib/types";
import { StarRating } from "@/components/star-rating";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES: { key: keyof Omit<ReviewRatings, "overallRating">; label: string }[] = [
  { key: "serviceRating", label: "Service" },
  { key: "staffRating", label: "Staff" },
  { key: "hygieneRating", label: "Hygiene" },
  { key: "ambienceRating", label: "Ambience" },
  { key: "productRating", label: "Products" },
];

const BLANK: ReviewRatings = { overallRating: 0, serviceRating: 0, staffRating: 0, hygieneRating: 0, ambienceRating: 0, productRating: 0 };

// POST /reviews (create) / PATCH /reviews/:reviewId (edit) — only reachable
// once a booking is COMPLETED (frontend_handover.md: happens automatically
// once the scheduled time passes, no separate "mark complete" action).
//
// There's no "my reviews" or "review for this booking" endpoint, so whether
// this booking already has a review is discovered by fetching the public
// GET /reviews/salon/:salonId list and matching on bookingId — real data
// via a real live endpoint, not a workaround around missing auth. This also
// solves editing: the reviewId needed for PATCH comes from that same match,
// not from anything persisted client-side.
export default function ReviewBookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [existing, setExisting] = useState<Review | null>(null);
  const [loadError, setLoadError] = useState("");

  const [ratings, setRatings] = useState<ReviewRatings>(BLANK);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetch<{ booking: BookingDetail }>(`/bookings/${bookingId}`)
      .then(async ({ booking: b }) => {
        setBooking(b);
        const reviews = await apiFetch<{ data: Review[] }>(`/reviews/salon/${b.salonId}`, {}, { auth: false });
        const mine = reviews.data.find((r) => r.bookingId === bookingId);
        if (mine) {
          setExisting(mine);
          setRatings({
            overallRating: mine.overallRating,
            serviceRating: mine.serviceRating ?? 0,
            staffRating: mine.staffRating ?? 0,
            hygieneRating: mine.hygieneRating ?? 0,
            ambienceRating: mine.ambienceRating ?? 0,
            productRating: mine.productRating ?? 0,
          });
          setText(mine.review || "");
        }
      })
      .catch((e) => setLoadError(messageFromError(e)));
  }, [bookingId]);

  const setRating = (key: keyof ReviewRatings, value: number) => setRatings((r) => ({ ...r, [key]: value }));

  const allRated = Object.values(ratings).every((v) => v >= 1);

  const submit = async () => {
    if (!allRated) {
      setError("Please rate every category before submitting.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const body = { ...ratings, review: text.trim() || undefined };
      if (existing) {
        await apiFetch(`/reviews/${existing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/reviews", { method: "POST", body: JSON.stringify({ bookingId, ...body }) });
      }
      setDone(true);
      toast.success(existing ? "Review updated." : "Thanks for your review!");
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 409
          ? "A review for this booking already exists — reload this page to edit it."
          : messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md space-y-3 bg-background px-5 py-8 md:max-w-2xl">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (booking.bookingStatus !== "COMPLETED") {
    return (
      <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl">
        <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
          <Lock className="size-8 text-accent" />
          <p className="font-semibold">Not reviewable yet</p>
          <p className="text-sm text-muted-foreground">Only a completed booking can be reviewed.</p>
          <Button variant="outline" onClick={() => router.push("/bookings")}>
            Back to My Bookings
          </Button>
        </Card>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center bg-background px-5 py-8 text-center md:max-w-2xl">
        <CheckCircle2 className="size-12 text-success" />
        <h1 className="mt-4 text-xl font-semibold">{existing ? "Review updated" : "Thanks for your review!"}</h1>
        <div className="mt-6 flex w-full flex-col gap-3">
          <Button className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" onClick={() => router.push(`/reviews/salon/${booking.salonId}`)}>
            See Salon Reviews
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/bookings")}>
            Back to My Bookings
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">{existing ? "Edit Review" : "Leave a Review"}</h1>
        <div className="size-8" />
      </div>

      <Card className="mt-6 p-4 text-sm">
        <p className="font-semibold">{booking.bookingNumber}</p>
        {booking.services.map((s) => (
          <p key={s.serviceId} className="text-muted-foreground">
            {s.serviceName}
          </p>
        ))}
      </Card>

      <div className="mt-6 space-y-5">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium">Overall Rating</p>
          <StarRating value={ratings.overallRating} onChange={(v) => setRating("overallRating", v)} />
        </div>

        <Card className="divide-y divide-border p-0">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between p-3">
              <span className="text-sm">{label}</span>
              <StarRating value={ratings[key]} onChange={(v) => setRating(key, v)} size="sm" />
            </div>
          ))}
        </Card>

        <div className="space-y-2">
          <label htmlFor="review-text" className="text-sm font-medium">
            Your review <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="review-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Excellent service…"
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button className="w-full bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90" disabled={busy} onClick={submit}>
          {busy ? "Submitting…" : existing ? "Update Review" : "Submit Review"}
        </Button>
      </div>
    </main>
  );
}
