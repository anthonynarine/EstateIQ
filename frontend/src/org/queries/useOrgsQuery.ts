// # Filename: src/org/queries/useOrgsQuery.ts


import { useQuery } from "@tanstack/react-query";
import { listMyOrgs, type Org } from "../../api/orgApi";

/**
 * useOrgsQuery
 *
 * TanStack Query server-state for org membership list.
 */
export function useOrgsQuery() {
  return useQuery<Org[]>({
    // Step 1: Stable cache key
    queryKey: ["orgs", "me"],

    // Step 2: Query function
    queryFn: async () => {
      return await listMyOrgs();
    },
  });
}
