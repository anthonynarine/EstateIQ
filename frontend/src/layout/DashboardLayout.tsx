// Step 1: inside DashboardLayout.tsx

import { Outlet } from "react-router-dom";
import type React from "react";
import DashboardNav from "../components/ui/DashboardNav";
import { useAuth } from "../auth/useAuth";  
import { useOrg } from "../features/tenancy/hooks/useOrg"; // adjust path

export default function DashboardLayout() {
  const { user } = useAuth();
  const { orgSlug } = useOrg();

  console.log("LAYOUR auth user:", user)
  console.log("LAYOUR orgSlug:", orgSlug)

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <div className="text-lg font-semibold tracking-tight">EstateIQ</div>

            {/* Step 2: identity strip */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                {user?.email || "Unknown user"}
              </span>

              <span className="text-white/30">•</span>

              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                Org: {orgSlug || "None selected"}
              </span>
            </div>
          </div>

          {/* Step 3: placeholder for org dropdown later */}
          <div className="flex items-center gap-2" />
        </div>

        <div className="mx-auto hidden w-full max-w-[1200px] px-4 pb-3 md:block">
          <DashboardNav variant="top" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-24">
        <Outlet />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur md:hidden">
        <div className="mx-auto w-full max-w-[1200px] px-2 py-2">
          <DashboardNav variant="bottom" />
        </div>
      </footer>
    </div>
  );
}