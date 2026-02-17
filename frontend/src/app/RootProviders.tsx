// # Filename: src/app/RootProviders.tsx

import { Outlet } from "react-router-dom";
import AuthProvider from "../auth/AuthProvider";
import { OrgProvider } from "../org/OrgProvider";

export default function RootProviders() {
  return (
    <AuthProvider>
      <OrgProvider>
        <Outlet />
      </OrgProvider>
    </AuthProvider>
  );
}
