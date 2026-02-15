// # Filename: src/components/ui/Page.tsx

import React from "react";

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg text-text">{children}</div>;
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-md px-4 py-10">{children}</div>;
}
