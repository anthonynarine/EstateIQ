// # Filename: src/auth/requireAuth.tsx

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrating } = useAuth();
  const location = useLocation();

  // Step 1: block redirects while restoring session
  if (isHydrating) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-zinc-300">Loading…</div>
      </div>
    );
  }

  // Step 2: redirect only after hydration completes
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  // Step 3: authenticated
  return <>{children}</>;
}