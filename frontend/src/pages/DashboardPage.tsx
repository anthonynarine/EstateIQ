// # Filename: src/pages/DashboardPage.tsx

import Button from "../components/ui/Button";
import { useAuth } from "../auth/useAuth";
import { useOrg } from "../org/useOrg";
import OrgSwitcher from "../org/OrgSwitcher";

export default function DashboardPage() {
  const { user, memberships, logout } = useAuth();
  const { orgSlug, clearOrgSlug } = useOrg();

  return (
    <div className="min-h-screen">
      {/* Overlay shows only when needed */}
      <OrgSwitcher />

      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">Dashboard</div>
            <div className="mt-1 text-sm text-zinc-400">
              Signed in as <span className="text-zinc-200">{user?.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => clearOrgSlug()} disabled={!orgSlug}>
              Clear Org
            </Button>
            <Button variant="ghost" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-sm font-semibold text-zinc-200">Selected Org</div>
            <div className="mt-2 text-lg">{orgSlug ?? "None selected"}</div>
            <div className="mt-2 text-sm text-zinc-400">
              Org-scoped API calls will include <span className="text-zinc-200">X-Org-Slug</span>{" "}
              once selected.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-sm font-semibold text-zinc-200">Memberships</div>
            <div className="mt-3 space-y-2">
              {memberships.map((m) => (
                <div
                  key={m.org_slug}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3"
                >
                  <div className="text-sm font-semibold">{m.org_slug}</div>
                  <div className="text-xs text-zinc-400">Role: {m.role}</div>
                </div>
              ))}
              {memberships.length === 0 ? (
                <div className="text-sm text-zinc-400">No memberships returned.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm font-semibold text-zinc-200">Next</div>
          <div className="mt-2 text-sm text-zinc-400">
            Next we’ll add an org-scoped endpoint call here (e.g. portfolio summary). That call should
            fail without org selection and succeed once <span className="text-zinc-200">X-Org-Slug</span>{" "}
            is set.
          </div>
        </div>
      </div>
    </div>
  );
}
