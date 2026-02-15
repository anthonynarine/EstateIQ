// # Filename: src/app/App.tsx

import { Outlet } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import { OrgProvider } from "./org/OrgProvider";

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
          <Outlet />
        </div>
      </OrgProvider>
    </AuthProvider>
  );
}
