// # Filename: src/pages/RegisterPage.tsx
// ✅ New Code
import React, { useState } from "react";
import { Link } from "react-router-dom";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthLayout from "../components/ui/AuthLayout";
import { Card, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";

import { useAuth } from "../auth/useAuth";

export default function RegisterPage() {
  const { register, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register({ email: email.trim(), password, password2 });
    } catch (err: any) {
      // Where: register() -> POST /api/v1/auth/register/
      // Why: validation error, backend down, CORS misconfig, or API response mismatch
      // Fix: check DevTools -> Network for status code + response body
      setError(
        err?.response?.data?.detail ||
          "Registration failed. Check backend."
      );
    }
  };

  return (
    <AuthLayout>
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardSubtitle>
            Register, then sign in to select your organization.
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
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
            Create account
          </Button>
        </form>

        <div className="mt-5 text-sm app-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-text hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
