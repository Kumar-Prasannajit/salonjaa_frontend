import Link from "next/link";
import { Search } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

// Nearby Salons search/filter (docs/designs/04-nearby-salons-based-on-service.jpeg).
// Same blocker as Home — see docs/PROPOSED_PUBLIC_BROWSE_CONTRACT.md. Module 2/3.
export default function ExplorePage() {
  return (
    <div className="flex flex-col items-center">
      <ComingSoon
        icon={Search}
        title="Explore salons & services"
        description="Search and filters land once the salon browse API is live. Nothing to query against yet."
      />
      {/* Dev-only, temporary — see app/book/start/page.tsx. Not a real nav
          entry, just the only way to reach Modules 4-7 while this tab is
          still blocked. Remove this link once Module 3 ships. */}
      <Link href="/book/start" className="-mt-8 pb-8 text-xs text-muted-foreground underline underline-offset-2">
        Dev: start a test booking →
      </Link>
    </div>
  );
}
