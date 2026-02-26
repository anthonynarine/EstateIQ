// # Filename: src/features/buildings/pages/BuildingDetailPage.tsx

import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useOrg } from "../../tenancy/hooks/useOrg";
import CreateUnitForm from "../components/CreateUnitForm"; // ✅ New Code
import { useUnitsQuery } from "../queries/useUnitsQuery";

/**
 * BuildingDetailPage
 *
 * Module E (Units under Building):
 * - Resolve buildingId from route
 * - Confirm orgSlug exists (canonical from OrgProvider)
 * - Render CreateUnitForm scoped to building
 * - Render Units list via TanStack Query (org-scoped key)
 */
export default function BuildingDetailPage() {
  // Step 1: Read buildingId from route
  const { buildingId } = useParams<{ buildingId: string }>();

  // Step 2: Get canonical orgSlug
  const { orgSlug } = useOrg();

  // Step 3: Parse + validate buildingId
  const buildingIdNumber = useMemo(() => {
    if (!buildingId) return null;
    const n = Number(buildingId);
    return Number.isFinite(n) ? n : null;
  }, [buildingId]);

  // Step 4: Guard invalid org
  if (!orgSlug) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Organization not selected. Add ?org=&lt;slug&gt; to URL.
        </div>
      </div>
    );
  }

  // Step 5: Guard invalid buildingId
  if (!buildingIdNumber) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Invalid building ID.
        </div>
      </div>
    );
  }

  // Step 6: Units query (org + building scoped)
  const {
    data: units = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useUnitsQuery({
    orgSlug,
    buildingId: buildingIdNumber,
    enabled: true,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-white">
          Building #{buildingIdNumber}
        </h1>
        <p className="text-sm text-neutral-400">Org: {orgSlug}</p>
      </div>

      {/* Create Unit */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
        <CreateUnitForm buildingId={buildingIdNumber} />
      </div>

      {/* Units List */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Units</h2>

          <div className="flex items-center gap-3">
            {(isFetching || isLoading) && (
              <span className="text-xs text-neutral-400">Updating…</span>
            )}

            {/* ✅ New Code */}
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
            Failed to load units.
            <div className="mt-2 text-xs text-red-200/80">
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          </div>
        ) : null}

        {/* Loading */}
        {isLoading ? (
          <div className="text-sm text-neutral-400">Loading units…</div>
        ) : null}

        {/* Empty */}
        {!isLoading && !error && units.length === 0 ? (
          <div className="text-sm text-neutral-400">
            No units yet. Create one above.
          </div>
        ) : null}

        {/* List */}
        {!isLoading && !error && units.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {units.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {u.label || `Unit #${u.id}`}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      {[
                        u.bedrooms != null ? `${u.bedrooms} bd` : null,
                        u.bathrooms != null ? `${u.bathrooms} ba` : null,
                        u.sqft != null ? `${u.sqft} sqft` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ") || "No details yet"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}