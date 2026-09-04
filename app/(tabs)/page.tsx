import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

// Home (docs/designs/02-profile-dashboard.jpeg). Blocked on the public
// browse contract this session drafted — see
// docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md — GET /public/branches doesn't
// exist yet, so there's nothing to list here. Module 2.
export default function HomePage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="Discover salons near you"
      description="The salon browse API is still being finalized. Once GET /public/branches ships, this becomes Home — search, nearby salons, and top services."
    />
  );
}
