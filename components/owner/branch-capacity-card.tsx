"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { BranchCapacityRule } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// POST /branches/:id/capacity-rule — sets an override on top of the
// chairs/staff-derived capacity formula (PROGRESS.md's Module 5 note). No GET
// for the current override exists, so — like the holidays card — this only
// shows what's been set in this session, not history from elsewhere.
export function BranchCapacityCard({ branchId }: { branchId: string }) {
  const toast = useToastContext();
  const [override, setOverride] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOverride(null);
    setValue("");
  }, [branchId]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiFetch<{ data: BranchCapacityRule }>(`/branches/${branchId}/capacity-rule`, {
        method: "POST",
        body: JSON.stringify({ maxCapacityOverride: Number(value) }),
      });
      setOverride(result.data.maxCapacityOverride);
      toast.success("Capacity override set.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-serif font-semibold">Capacity Override</h2>
      <p className="text-xs text-muted-foreground">
        Effective capacity is normally MIN(chairs, eligible staff). An override caps it further — there&apos;s no read endpoint, so this shows only
        what you set just now.
      </p>

      {override !== null && <p className="mt-3 text-sm">Current override: <span className="font-semibold">{override}</span></p>}

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={save} className="mt-4 flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="capacity-override">Max capacity override</Label>
          <Input id="capacity-override" type="number" min="1" required value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button type="submit" size="sm" disabled={busy} className="bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
          {busy ? "Saving…" : "Set"}
        </Button>
      </form>
    </Card>
  );
}
