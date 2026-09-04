import { Calendar } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

// My Bookings (docs/designs/12-user-bookings.jpeg). GET /bookings/my-bookings
// is live, but the whole browse-to-book flow that produces bookings (Modules
// 2-6) isn't built yet, so this stays a placeholder rather than wiring a
// history list with nothing that can ever populate it. Module 7.
export default function BookingsPage() {
  return (
    <ComingSoon
      icon={Calendar}
      title="Your bookings"
      description="Booking history lands with Module 7, once the browse-to-checkout flow is built end to end."
    />
  );
}
