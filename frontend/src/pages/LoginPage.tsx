// # Filename: src/pages/LoginPage.tsx

import React, { useState } from "react";
import { Link } from "react-router-dom";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthLayout from "../components/ui/AuthLayout";
import { Card, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";

import { useAuth } from "../auth/useAuth";

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      // Where: login() -> /api/v1/auth/token/ then /api/v1/auth/me/
      // Why: invalid credentials, backend down, CORS misconfig, or API response mismatch
      // Fix: check DevTools -> Network for status code + response body
      setError(
        err?.response?.data?.detail ||
          "Login failed. Check credentials and backend."
      );
    }
  };

  return (
    <AuthLayout>
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardSubtitle>
            Access your portfolio analytics and org workspace.
          </CardSubtitle>
        </CardHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error ? (
            <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
          >
            Sign in
          </Button>
        </form>

        <div className="mt-5 text-sm app-muted">
          No account?{" "}
          <Link to="/register" className="text-text hover:underline">
            Create one
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
