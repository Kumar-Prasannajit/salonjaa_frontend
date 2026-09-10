"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// In-memory client-side state for the browse-to-book flow — nothing here is
// persisted server-side until Module 5's Checkout actually calls
// POST /bookings (which is what creates the real PENDING booking + reserves
// capacity). Lost on reload, same as the auth tokens in lib/api-client.ts;
// that's an accepted tradeoff for a multi-step flow with no server-side
// "draft" resource anywhere in the API.
// Module 22 — variantId/variantName are null when the service has no
// variants (or a "no variant" bare-string booking is genuinely intended).
// `price` is the effective price to charge/display (the chosen variant's
// price when set, basePrice otherwise) — always use this for totals, never
// basePrice directly, since a variant overrides price only.
export type DraftService = {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  variantId: string | null;
  variantName: string | null;
  price: number;
};

export type BookingDraft = {
  branchId: string | null;
  salonId: string | null;
  services: DraftService[];
  staffId: string | null;
  staffName: string | null;
  date: string | null; // YYYY-MM-DD
  slotId: string | null;
  slotLabel: string | null; // "10:00 AM – 11:00 AM"
};

const EMPTY_DRAFT: BookingDraft = {
  branchId: null,
  salonId: null,
  services: [],
  staffId: null,
  staffName: null,
  date: null,
  slotId: null,
  slotLabel: null,
};

type BookingDraftContextValue = {
  draft: BookingDraft;
  setServices: (branchId: string, salonId: string, services: DraftService[]) => void;
  setStylist: (staffId: string | null, staffName: string | null) => void;
  setSlot: (date: string, slotId: string, slotLabel: string) => void;
  reset: () => void;
};

const BookingDraftContext = createContext<BookingDraftContextValue | null>(null);

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_DRAFT);

  const value: BookingDraftContextValue = {
    draft,
    setServices: (branchId, salonId, services) =>
      setDraft((d) => ({ ...d, branchId, salonId, services, staffId: null, staffName: null, date: null, slotId: null, slotLabel: null })),
    setStylist: (staffId, staffName) => setDraft((d) => ({ ...d, staffId, staffName })),
    setSlot: (date, slotId, slotLabel) => setDraft((d) => ({ ...d, date, slotId, slotLabel })),
    reset: () => setDraft(EMPTY_DRAFT),
  };

  return <BookingDraftContext.Provider value={value}>{children}</BookingDraftContext.Provider>;
}

export function useBookingDraft() {
  const ctx = useContext(BookingDraftContext);
  if (!ctx) throw new Error("useBookingDraft must be used within BookingDraftProvider");
  return ctx;
}
