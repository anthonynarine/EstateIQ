// # Filename: src/app/RootProviders.tsx
// ✅ New Code

import { Outlet } from "react-router-dom";

import QueryProvider from "./QueryProvider";

import AuthProvider  from "../auth/AuthProvider";
import  OrgProvider  from "../org/OrgProvider";

type Props = {
  children?: React.ReactNode;
};

export default function RootProviders({ children }: Props) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OrgProvider>
          {/* Step 1: Router layout renders nested routes here */}
          {children ?? <Outlet />}
        </OrgProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
