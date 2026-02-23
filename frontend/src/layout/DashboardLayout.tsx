// # Filename: src/layout/DashboardLayout.tsx
import type React from "react";
import { Outlet } from "react-router-dom";
import DashboardNav from "../components/ui/DashboardNav";

type Props = {
  headerRight?: React.ReactNode;
  headerSubtitle?: React.ReactNode;
};

export default function DashboardLayout({ headerRight, headerSubtitle }: Props) {
  return (
    <div className="min-h-[100dvh] w-full bg-black text-white">
      {/* Step 1: Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <div className="text-lg font-semibold tracking-tight">EstateIQ</div>
            {headerSubtitle ? (
              <div className="text-xs text-white/60">{headerSubtitle}</div>
            ) : null}
          </div>

          {/* Step 2: Org dropdown goes here later */}
          <div className="flex items-center gap-2">{headerRight}</div>
        </div>

        {/* Step 3: Desktop nav row */}
        <div className="mx-auto hidden w-full max-w-[1200px] px-4 pb-3 md:block">
          <DashboardNav variant="top" />
        </div>
      </header>

      {/* Step 4: Content */}
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Step 5: Mobile Bottom Nav */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur md:hidden">
        <div className="mx-auto w-full max-w-[1200px] px-2 py-2">
          <DashboardNav variant="bottom" />
        </div>
      </footer>
    </div>
  );
}