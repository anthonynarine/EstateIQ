// # Filename: src/org/components/CreateOrgCard.tsx


import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateOrgMutation } from "../queries/useCreateOrgMutations";
import { useOrg } from "../hooks/useOrg";
/**
 * CreateOrgCard
 *
 * Production behavior:
 * - Creates an organization
 * - Immediately sets active orgSlug in OrgProvider (no waiting for refetch)
 * - Optionally navigates user into the product flow (Tenants)
 *
 * Why:
 * - Most API requests require X-Org-Slug
 * - First-run UX should not leave user "stuck" after creating org
 */
export default function CreateOrgCard() {
  // Step 1: Router navigation
  const navigate = useNavigate();

  // Step 2: Access OrgProvider setter
  const orgCtx = useOrg();
  const setOrgSlug = orgCtx.setOrgSlug;

  // Step 3: Form state
  const [name, setName] = useState("");

  // Step 4: Mutation
  const createOrg = useCreateOrgMutation();

  // Step 5: Local validation
  const canSubmit = useMemo(() => {
    return name.trim().length >= 3 && !createOrg.isPending;
  }, [name, createOrg.isPending]);

  const handleCreate = async () => {
    // Step 6: Guard rails
    if (!canSubmit) return;

    // Step 7: Create org
    const org = await createOrg.mutateAsync({ name: name.trim() });

    // Step 8: Immediately select this org (so X-Org-Slug is ready now)
    setOrgSlug(org.slug);

    // Step 9: Reset UI
    setName("");

    // Step 10: Move user into the product flow
    navigate(`/dashboard?org=${org.slug}`, { replace: true });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="text-lg font-semibold text-zinc-100">
        Create your first organization
      </div>

      <div className="mt-1 text-sm text-zinc-400">
        This enables multi-tenant scoping via{" "}
        <span className="text-zinc-200">X-Org-Slug</span>.
      </div>

      {createOrg.errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-200">
          {createOrg.errorMessage}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-300">Organization name</span>
          <input
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Narine Holdings LLC"
          />
          <span className="text-xs text-zinc-500">
            Minimum 3 characters.
          </span>
        </label>

        <button
          className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40"
          onClick={() => void handleCreate()}
          disabled={!canSubmit}
        >
          {createOrg.isPending ? "Creating…" : "Create Organization"}
        </button>
      </div>
    </div>
  );
}

