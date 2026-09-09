"use client";

import { FormEvent, useEffect, useState } from "react";
import { Images, Plus, X } from "lucide-react";
import { apiFetch, messageFromError } from "@/lib/api-client";
import { useToastContext } from "@/hooks/toast-context";
import type { SalonGalleryImage } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// GET/POST /salons/:salonId/gallery, DELETE .../gallery/:imageId (Module
// 17) — same "URL string, frontend hosts the file elsewhere" pattern as the
// salon logo/cover fields already on this page, no upload mechanism
// invented. Backs GET /public/branches/:branchId's `gallery` field, which
// was always `[]` before this existed.
export function SalonGalleryCard({ salonId }: { salonId: string }) {
  const toast = useToastContext();
  const [images, setImages] = useState<SalonGalleryImage[] | null>(null);
  const [error, setError] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    setError("");
    try {
      const result = await apiFetch<{ data: SalonGalleryImage[] }>(`/salons/${salonId}/gallery`);
      setImages(result.data);
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const result = await apiFetch<{ data: SalonGalleryImage }>(`/salons/${salonId}/gallery`, {
        method: "POST",
        body: JSON.stringify({ imageUrl: imageUrl.trim() }),
      });
      setImages((all) => [...(all || []), result.data]);
      setImageUrl("");
      toast.success("Photo added.");
    } catch (e) {
      const msg = messageFromError(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (image: SalonGalleryImage) => {
    setRemovingId(image.id);
    setError("");
    try {
      await apiFetch(`/salons/${salonId}/gallery/${image.id}`, { method: "DELETE" });
      setImages((all) => all?.filter((x) => x.id !== image.id) || null);
      toast.success("Photo removed.");
    } catch (e) {
      const msg = messageFromError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-semibold">Gallery</h2>
      <p className="text-xs text-muted-foreground">Shown on the salon&apos;s public detail page. Paste an image URL — there&apos;s no upload endpoint yet.</p>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-3 space-y-2">
        {images === null && <Skeleton className="h-16 w-full rounded-lg" />}
        {images?.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Images className="size-4" />
            No photos yet.
          </p>
        )}
        {images && images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote, owner-supplied URL. */}
                <img src={img.imageUrl} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(img)}
                  disabled={removingId === img.id}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={add} className="mt-4 flex items-end gap-2 border-t border-border pt-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="gallery-url">Image URL</Label>
          <Input id="gallery-url" type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
        <Button type="submit" size="sm" disabled={busy} className="gap-1.5 bg-gradient-to-r from-gold to-gold-bright text-primary-foreground hover:opacity-90">
          <Plus className="size-4" />
          {busy ? "Adding…" : "Add"}
        </Button>
      </form>
      {formError && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
