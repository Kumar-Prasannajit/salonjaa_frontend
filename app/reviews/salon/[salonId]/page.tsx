"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Flag, MessageSquareOff, Store } from "lucide-react";
import { apiFetch, ApiError, messageFromError } from "@/lib/api-client";
import { useAccountContext } from "@/hooks/account-context";
import type { Review } from "@/lib/types";
import { StarRating } from "@/components/star-rating";
import { ReportReviewDialog } from "@/components/report-review-dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md notes there's no salon *detail*
// page yet (blocked on the browse contract) — but GET /reviews/salon/:salonId
// is itself public and doesn't need it, reachable today from any booking's
// own known salonId (My Bookings, Booking Confirmed, the review page).
// The aggregate rating shown here is computed client-side from these same
// rows — real data, not a fabricated summary field.
export default function SalonReviewsPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const router = useRouter();
  const account = useAccountContext();

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState("");

  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<{ data: Review[] }>(`/reviews/salon/${salonId}`, {}, { auth: false })
      .then((result) => setReviews(result.data))
      .catch((e) => setError(messageFromError(e)));
  }, [salonId]);

  const average = reviews?.length ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length : 0;

  const confirmReport = async (reason: string) => {
    if (!reportTarget) return;
    setReportBusy(true);
    setReportError("");
    try {
      await apiFetch(`/reviews/${reportTarget}/report`, { method: "POST", body: JSON.stringify({ reason: reason.trim() || undefined }) });
      setReportedIds((prev) => new Set(prev).add(reportTarget));
      setReportTarget(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setReportedIds((prev) => new Set(prev).add(reportTarget));
        setReportTarget(null);
      } else {
        setReportError(messageFromError(e));
      }
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-background px-5 py-8 md:max-w-2xl md:px-10 md:py-12">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold md:text-left md:text-2xl">Reviews</h1>
        <div className="size-8" />
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && reviews === null && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {reviews !== null && reviews.length === 0 && (
        <Card className="mt-6 flex flex-col items-center gap-3 border-dashed p-10 text-center">
          <MessageSquareOff className="size-8 text-accent" />
          <p className="font-semibold">No reviews yet</p>
          <p className="text-sm text-muted-foreground">This salon hasn&apos;t been reviewed yet.</p>
        </Card>
      )}

      {reviews !== null && reviews.length > 0 && (
        <>
          <Card className="mt-6 flex-row items-center gap-4 p-4">
            <div className="grid size-12 place-items-center rounded-xl border border-primary/40 bg-primary/10">
              <Store className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{average.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
            </div>
          </Card>

          <div className="mt-4 space-y-4">
            {reviews.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <StarRating value={r.overallRating} size="sm" />
                  <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.review && <p className="mt-2 text-sm">{r.review}</p>}
                {r.reply && (
                  <div className="mt-3 rounded-lg bg-secondary p-3 text-sm">
                    <p className="text-xs font-medium text-primary">Salon response</p>
                    <p className="mt-1 text-secondary-foreground">{r.reply.message}</p>
                  </div>
                )}
                <div className="mt-3">
                  {reportedIds.has(r.id) ? (
                    <span className="text-xs text-muted-foreground">Reported</span>
                  ) : account.isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReportError("");
                        setReportTarget(r.id);
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Flag className="size-3" />
                      Report
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sign in to report a review</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ReportReviewDialog
        open={!!reportTarget}
        busy={reportBusy}
        error={reportError}
        onConfirm={confirmReport}
        onClose={() => {
          setReportTarget(null);
          setReportError("");
        }}
      />
    </main>
  );
}
