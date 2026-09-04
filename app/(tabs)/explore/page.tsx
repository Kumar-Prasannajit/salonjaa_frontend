import { Search } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

// Nearby Salons search/filter (docs/designs/04-nearby-salons-based-on-service.jpeg).
// Same blocker as Home — see docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md. Module 2/3.
export default function ExplorePage() {
  return (
    <ComingSoon
      icon={Search}
      title="Explore salons & services"
      description="Search and filters land once the salon browse API is live. Nothing to query against yet."
    />
  );
}
