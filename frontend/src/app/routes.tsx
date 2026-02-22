
// # Filename: src/app/routes.tsx

import { createBrowserRouter, Navigate } from "react-router-dom";

import RootProviders from "./RootProviders";
import App from "./App";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

import RequireAuth from "../auth/requireAuth";

import DashboardLayout from "../features/tenancy/pages/DashboardLayout";
import DashboardPage from "../features/tenancy/pages/DashboardPage";

import TenantsPage from "../features/tenancy/pages/TenantsPage";
import UnitLeasesPage from "../features/tenancy/pages/UnitLeasesPage";
import LeaseLedgerPage from "../features/finance/pages/LeaseLedgerPage";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <RootProviders />,
    children: [
      {
        element: <App />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },

          // Public
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },

          // Protected Dashboard (DashboardLayout owns header/nav; children render in <Outlet />)
          {
            path: "dashboard",
            element: (
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            ),
            children: [
              { index: true, element: <DashboardPage /> },

              // Tenancy
              { path: "tenants", element: <TenantsPage /> },
              { path: "units/:unitId/leases", element: <UnitLeasesPage /> },

              // Finance
              { path: "leases/:leaseId/ledger", element: <LeaseLedgerPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

export default routes;