import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Local-time YYYY-MM-DD — GET /availability/slots|staff's date query format.
// Deliberately not toISOString() (that's UTC and can land on the wrong day
// for the user's local evening).
export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "10:00" -> "10:00 AM" for display (backend times are 24h "HH:MM").
export function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Full ISO datetime (e.g. a booking's scheduledStart, which the backend
// sends in UTC) -> "Tue, 21 May 2026 • 2:00 PM" in the viewer's local time.
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const dateLabel = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timeLabel = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} • ${timeLabel}`;
}

function toICSDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Builds a minimal .ics file client-side from a confirmed booking's own
// data (no backend endpoint for this — none is documented) and triggers a
// download. Every field here is real booking data; nothing fabricated.
export function downloadBookingICS(booking: { bookingNumber: string; scheduledStart: string; scheduledEnd: string; serviceNames: string[] }) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salonjaa//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${booking.bookingNumber}@salonjaa`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(booking.scheduledStart)}`,
    `DTEND:${toICSDate(booking.scheduledEnd)}`,
    `SUMMARY:Salonjaa — ${booking.serviceNames.join(", ")}`,
    `DESCRIPTION:Booking ${booking.bookingNumber}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${booking.bookingNumber}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
