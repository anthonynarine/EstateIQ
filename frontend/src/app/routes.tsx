// # Filename: src/app/routes.tsx
// ✅ New Code
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import RootProviders from "./RootProviders";
import App from "./App";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import RequireAuth from "../auth/requireAuth";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <RootProviders />, // <-- Providers live inside Router now
    children: [
      {
        element: <App />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },

          // Public
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },

          // Protected
          {
            path: "dashboard",
            element: (
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
