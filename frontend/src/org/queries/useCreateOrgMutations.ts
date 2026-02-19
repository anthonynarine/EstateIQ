// # Filename: src/org/queries/useCreateOrgMutation.ts


import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createOrg, type CreateOrgPayload, type Org } from "../../api/orgApi";
import { formatApiError } from "../../api/formatApiError";

/**
 * useCreateOrgMutation
 *
 * Creates an org and invalidates org list.
 */
export function useCreateOrgMutation() {
  const qc = useQueryClient();

  const mutation = useMutation<Org, unknown, CreateOrgPayload>({
    mutationFn: async (payload) => {
      return await createOrg(payload);
    },
    onSuccess: async () => {
      // Step 1: Refresh org list after create
      await qc.invalidateQueries({ queryKey: ["orgs", "me"] });
    },
  });

  const errorMessage = useMemo(() => {
    if (!mutation.error) return null;
    return formatApiError(mutation.error);
  }, [mutation.error]);

  return {
    ...mutation,
    errorMessage,
  };
}
