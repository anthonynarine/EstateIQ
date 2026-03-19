// # Filename: src/app/routes.tsx

import { createBrowserRouter, Navigate } from "react-router-dom";

import RootProviders from "./RootProviders";
import App from "./App";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

import RequireAuth from "../auth/requireAuth";
import DashboardLayout from "../layout/DashboardLayout";

import DashboardPage from "../features/tenancy/pages/DashboardPage";
import TenancyPage from "../features/tenancy/pages/TenancyPage";
import TenantsPage from "../features/tenants/pages/TenantsPage";
import UnitLeasesPage from "../features/tenancy/pages/UnitLeasesPage";
import LeaseLedgerPage from "../features/finance/pages/LeaseLedgerPage";
import ExpensesPage from "../features/expenses/pages/ExpensesPage"; // ✅ New Code

import BuildingsPage from "../features/buildings/pages/BuildingPage/BuildingsPage";
import BuildingDetailPage from "../features/buildings/pages/BuildingDetailPage/BuildingDetailPage";
import UnitDetailPage from "../features/leases/pages/UnitLeaseDetailPage";
import NeuralComponentTreePage from "../features/easterEgg/pages/NeuralComponentTreePage";
import LeaseCreatePage from "../features/leases/pages/LeaseCreatePage";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <RootProviders />,
    children: [
      {
        element: <App />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },

          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },

          {
            path: "dashboard",
            element: (
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            ),
            children: [
              { index: true, element: <DashboardPage /> },

              // Tenancy app workspace
              { path: "tenancy", element: <TenancyPage /> },

              // Tenant domain workspace
              { path: "tenants", element: <TenantsPage /> },

              // Finance / expenses workspace
              { path: "expenses", element: <ExpensesPage /> },

              { path: "units/:unitId", element: <UnitDetailPage /> },
              { path: "units/:unitId/leases", element: <UnitLeasesPage /> },
              { path: "leases/new", element: <LeaseCreatePage /> },
              { path: "buildings", element: <BuildingsPage /> },
              { path: "buildings/:buildingId", element: <BuildingDetailPage /> },

              { path: "leases/:leaseId/ledger", element: <LeaseLedgerPage /> },

              // Fun / lab page
              { path: "lab/neural-tree", element: <NeuralComponentTreePage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

export default routes;