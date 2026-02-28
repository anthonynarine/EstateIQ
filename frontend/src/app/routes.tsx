// # Filename: src/app/routes.tsx

import { createBrowserRouter, Navigate } from "react-router-dom";

import RootProviders from "./RootProviders";
import App from "./App";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

import RequireAuth from "../auth/requireAuth";
import DashboardLayout from "../layout/DashboardLayout";

import DashboardPage from "../features/tenancy/pages/DashboardPage";
import TenantsPage from "../features/tenancy/pages/TenantsPage";
import UnitLeasesPage from "../features/tenancy/pages/UnitLeasesPage";
import LeaseLedgerPage from "../features/finance/pages/LeaseLedgerPage";

import BuildingsPage from "../features/buildings/pages/BuildingsPage";
import BuildingDetailPage from "../features/buildings/pages/BuildingDetailPage";
import UnitDetailPage from "../features/leases/pages/UnitDetailPage";

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

          // Protected Dashboard
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

              // Unit detail (Lease creation + list lives here)
              { path: "units/:unitId", element: <UnitDetailPage /> },

              // Existing (you can keep this for now; we may retire later)
              { path: "units/:unitId/leases", element: <UnitLeasesPage /> },

              // Properties (Buildings → Units)
              { path: "buildings", element: <BuildingsPage /> },
              { path: "buildings/:buildingId", element: <BuildingDetailPage /> },

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