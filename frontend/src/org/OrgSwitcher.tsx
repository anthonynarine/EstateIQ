// # Filename: src/org/OrgSwitcher.tsx

import React, { useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/useAuth";
import { useOrg } from "./useOrg";

export default function OrgSwitcher() {
  const { memberships } = useAuth();
  const { orgSlug, setOrgSlug } = useOrg();
  const [selected, setSelected] = useState<string>("");

  const shouldShow = useMemo(() => {
    return memberships.length > 1 && !orgSlug;
  }, [memberships.length, orgSlug]);

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="text-lg font-semibold text-zinc-100">Select an organization</div>
        <div className="mt-1 text-sm text-zinc-400">
          You have access to multiple orgs. Choose one to continue.
        </div>

        <div className="mt-4 space-y-2">
          {memberships.map((m) => (
            <button
              key={m.org_slug}
              type="button"
              onClick={() => setSelected(m.org_slug)}
              className={[
                "w-full rounded-xl border px-4 py-3 text-left transition",
                selected === m.org_slug
                  ? "border-zinc-500 bg-zinc-900/70"
                  : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/40",
              ].join(" ")}
            >
              <div className="text-sm font-semibold text-zinc-100">{m.org_slug}</div>
              <div className="text-xs text-zinc-400">Role: {m.role}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => setOrgSlug(selected)}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
