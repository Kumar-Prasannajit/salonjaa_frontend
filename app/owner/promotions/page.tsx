"use client";

import { PromotionsManager } from "@/components/owner/promotions-manager";

// GET/POST /promotions, PATCH/DELETE /promotions/:id (Module 17) — a
// top-level page rather than nested under one salon, since a promotion
// targets branches by ID with no salonId scoping anywhere in the
// documented contract; see promotions-manager.tsx's own note.
export default function OwnerPromotionsPage() {
  return (
    <main>
      <h1 className="text-lg font-semibold md:text-2xl">Promotions</h1>
      <div className="mt-6">
        <PromotionsManager />
      </div>
    </main>
  );
}
