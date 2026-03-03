// # Filename: src/features/buildings/pages/BuildingDetailpage/hooks/useDeleteUnitMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUnit, type Unit } from "../../../api/unitsApi";

/**
 * useDeleteUnitMutation
 *
 * Deletes a Unit (hard delete) and keeps the Unit list UI in sync.
 *
 * Backend may return 409 if:
 * - Active lease exists
 * - Lease history exists (ledger integrity)
 *
 * Strategy:
 * 1) Optimistically remove the unit from any cached Unit[] list with key:
 *    ["org", <slug>, "units", buildingId]
 * 2) On error, rollback.
 * 3) On success, invalidate matching queries to reconcile with server truth.
 */
export function useDeleteUnitMutation(buildingId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unitId: number) => deleteUnit(unitId),

    onMutate: async (unitId: number) => {
      // Step 1: Cancel outgoing fetches for units under this building
      await queryClient.cancelQueries({
        predicate: (q) => {
          const key = q.queryKey;
          return (
            Array.isArray(key) &&
            key.length === 4 &&
            key[0] === "org" &&
            key[2] === "units" &&
            key[3] === buildingId
          );
        },
      });

      // Step 2: Snapshot previous lists for rollback
      const snapshots = queryClient.getQueriesData<Unit[]>({
        predicate: (q) => {
          const key = q.queryKey;
          return (
            Array.isArray(key) &&
            key.length === 4 &&
            key[0] === "org" &&
            key[2] === "units" &&
            key[3] === buildingId
          );
        },
      });

      // Step 3: Optimistically remove from all matching cached lists
      for (const [queryKey, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<Unit[]>(
          queryKey,
          data.filter((u) => u.id !== unitId)
        );
      }

      // Step 4: Return rollback context
      return { snapshots };
    },

    onError: (_err, _unitId, ctx) => {
      // Step 5: Rollback optimistic removal
      if (!ctx?.snapshots) return;

      for (const [queryKey, previous] of ctx.snapshots) {
        queryClient.setQueryData(queryKey, previous);
      }
    },

    onSuccess: () => {
      // Step 6: Reconcile with server truth
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          return (
            Array.isArray(key) &&
            key.length === 4 &&
            key[0] === "org" &&
            key[2] === "units" &&
            key[3] === buildingId
          );
        },
      });
    },
  });
}