// # Filename: src/pages/LoginPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "../auth/useAuth";
import { tokenStorage } from "../auth/tokenStorage";

/**
 * LoginPage
 *
 * Minimal login screen:
 *  - collects email/password
 *  - calls AuthProvider.login(email, password)
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const registered = Boolean((location.state as any)?.registered);
  const prefillEmail = (location.state as any)?.email as string | undefined;

  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Step 1: Prevent expired/stale tokens from interfering with auth endpoints
    tokenStorage.clearAll();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        await login(email.trim(), password);
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        const data = err?.response?.data;

        // Step 1: DRF detail string
        if (data?.detail) {
          setError(String(data.detail));
        } else {
          setError("Login failed. Please try again.");
        }
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

        {registered ? (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm">
            Account created successfully. Please sign in.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {error}
          </div>
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
          <div className="relative">
            <input
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 pr-10"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() => setIsPasswordVisible((v) => !v)}
              className={[
                "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1",
                "text-gray-400 hover:text-white",
                "opacity-90 hover:opacity-100",
                "focus:outline-none focus:ring-2 focus:ring-white/10",
              ].join(" ")}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          className="w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-sm opacity-80">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="underline underline-offset-4 hover:opacity-100">
            Create one
          </Link>
        </div>
      </form>
    </div>
  );
}