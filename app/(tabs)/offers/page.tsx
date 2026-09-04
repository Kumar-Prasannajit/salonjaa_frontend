import { Tag } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

// No design screen for this tab, and no backend contract either — only
// POST /payments/coupons/validate (validate-by-code) exists, there's no
// endpoint to list active offers/coupons. Same "Coming soon" treatment as
// the disabled rows in profile-menu.tsx. Not scheduled in any module yet —
// needs a real contract first.
export default function OffersPage() {
  return (
    <ComingSoon
      icon={Tag}
      title="Offers"
      description="No offers-listing API exists yet — only a coupon-code validator at checkout. This tab stays a placeholder until that contract exists."
    />
  );
}
