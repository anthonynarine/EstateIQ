// # Filename: src/features/buildings/pages/BuildingDetailPage.tsx

import { useParams } from "react-router-dom";
import { useOrg } from "@/features/tenancy/context/OrgProvider";

/**
 * BuildingDetailPage
 *
 * Phase 1:
 * - Resolve buildingId from route
 * - Confirm orgSlug exists
 * - Render stable shell
 *
 * Units query will be added in Step 2.
 */
export default function BuildingDetailPage() {
  // Step 1: Read buildingId from route
  const { buildingId } = useParams<{ buildingId: string }>();

  // Step 2: Get canonical orgSlug
  const { orgSlug } = useOrg();

  // Step 3: Guard invalid org
  if (!orgSlug) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Organization not selected. Add ?org=&lt;slug&gt; to URL.
        </div>
      </div>
    );
  }

  // Step 4: Guard invalid buildingId
  if (!buildingId || isNaN(Number(buildingId))) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Invalid building ID.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Building #{buildingId}
        </h1>
        <p className="text-sm text-neutral-400">
          Org: {orgSlug}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-400">
        Units will load here in next step.
      </div>
    </div>
  );
}