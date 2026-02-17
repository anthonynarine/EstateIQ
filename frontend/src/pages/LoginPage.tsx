// # Filename: src/pages/LoginPage.tsx
import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

/**
 * LoginPage
 *
 * Minimal login screen:
 *  - collects email/password
 *  - calls AuthProvider.login(email, password)
 */

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        await login(email.trim(), password);
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Login failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, login, navigate]
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm opacity-80">Use your email and password.</p>
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm">Email</label>
          <input
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm">Password</label>
          <input
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          className="w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

