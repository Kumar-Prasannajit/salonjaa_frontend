"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareWarning } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import type { AdminComplaint } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TABS = [
  { key: "", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

const VARIANT: Record<AdminComplaint["status"], "default" | "destructive" | "outline"> = {
  OPEN: "outline",
  IN_PROGRESS: "outline",
  RESOLVED: "default",
  REJECTED: "destructive",
};

// GET /admin/complaints?status= — filed by Customer or Salon Owner via
// POST /complaints (not itself an admin route); every complaint currently
// goes straight OPEN→RESOLVED/REJECTED, IN_PROGRESS has no transition into it
// yet (PROGRESS.md's Module 9c note), so that tab will simply stay empty.
export default function AdminComplaintsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("OPEN");
  const [complaints, setComplaints] = useState<AdminComplaint[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setComplaints(null);
    apiFetch<{ data: AdminComplaint[] }>(`/admin/complaints${tab ? `?status=${tab}` : ""}`)
      .then((r) => setComplaints(r.data))
      .catch((e) => setError(messageFromError(e)));
  }, [tab]);

  return (
    <main>
      <h1 className="font-serif text-lg font-semibold md:text-2xl">Complaints Queue</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-gradient-to-r from-brass to-brass-bright text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && complaints === null && (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        )}

        {complaints?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <MessageSquareWarning className="size-8 text-accent" />
            <p className="font-semibold">Nothing here</p>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {complaints?.map((c) => (
            <Card key={c.id} className="cursor-pointer gap-1 p-4 transition-colors hover:bg-accent/40" onClick={() => router.push(`/admin/complaints/${c.id}`)}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{c.type}</p>
                <Badge variant={VARIANT[c.status]}>{c.status}</Badge>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              <p className="text-xs text-muted-foreground">
                {c.filedBy.fullName || c.filedBy.email} • {formatDateTime(c.createdAt)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
