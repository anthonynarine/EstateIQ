// # Filename: src/features/buildings/queries/useUpdateUnitMutation.ts
// ✅ New Code

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUnit, type UpdateUnitInput, type Unit } from "../api/unitsApi";

/**
 * useUpdateUnitMutation
 *
 * Updates a Unit (PATCH) and keeps the Unit list UI in sync.
 *
 * Why this exists:
 * - React Query does not auto-refresh lists after mutations.
 * - We must explicitly update cache and/or invalidate relevant queries.
 *
 * Strategy:
 * 1) Optimistically update any cached Unit[] list that matches:
 *    ["org", <slug>, "units", buildingId]
 * 2) On success, ensure the canonical queries are invalidated to reconcile
 *    any server-side normalization/rules.
 * 3) On error, rollback optimistic cache changes.
 */
export function useUpdateUnitMutation(buildingId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      unitId,
      payload,
    }: {
      unitId: number;
      payload: UpdateUnitInput;
    }) => {
      return updateUnit(unitId, payload);
    },

    onMutate: async ({ unitId, payload }) => {
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

      // Step 2: Snapshot previous lists so we can rollback on error
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

      // Step 3: Optimistically patch cached unit lists
      for (const [queryKey, data] of snapshots) {
        if (!data) continue;

        const next = data.map((u) => {
          if (u.id !== unitId) return u;

          // NOTE: Keep building out of payload by contract.
          // We only patch local fields we expect to change.
          return {
            ...u,
            label: payload.label ?? u.label,
            bedrooms: payload.bedrooms ?? u.bedrooms,
            bathrooms: payload.bathrooms ?? u.bathrooms,
            // Some APIs use sqft vs square_feet; keep both safe.
            sqft: (payload as any).sqft ?? (payload as any).square_feet ?? (u as any).sqft,
            square_feet:
              (payload as any).square_feet ??
              (payload as any).sqft ??
              (u as any).square_feet,
          } as Unit;
        });

        queryClient.setQueryData<Unit[]>(queryKey, next);
      }

      // Step 4: Return rollback context
      return { snapshots };
    },

    onError: (_err, _vars, ctx) => {
      // Step 5: Rollback optimistic update
      if (!ctx?.snapshots) return;

      for (const [queryKey, previous] of ctx.snapshots) {
        queryClient.setQueryData(queryKey, previous);
      }
    },

    onSuccess: (_updatedUnit) => {
      // Step 6: Always reconcile with server truth (rules/normalization)
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