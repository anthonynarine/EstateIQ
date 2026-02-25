// # Filename: src/pages/RegisterPage.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthLayout from "../components/ui/AuthLayout";
import { Card, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";

import { useAuth } from "../auth/useAuth";
import { tokenStorage } from "../auth/tokenStorage";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    // Step 1: Prevent expired/stale tokens from breaking public auth endpoints
    tokenStorage.clearAll();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Step 1: Basic client-side validation
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 2: Register only (no auto-login)
      await register({ email: email.trim(), password, password2 });

      // Step 3: Navigate to login (clean auth separation)
      navigate("/login", {
        replace: true,
        state: { registered: true, email: email.trim() },
      });
    } catch (err: any) {
      // Where: register() -> POST /api/v1/auth/register/
      // Why: DRF serializer validation failed OR server/network issue
      // Fix: normalize err.response.data into a readable message
      const data = err?.response?.data;

      // Step 4: DRF field errors: { email: ["..."], password: ["..."] }
      if (data && typeof data === "object") {
        const entries = Object.entries(data);

        if (entries.length > 0) {
          const messages = entries
            .map(([field, value]) => {
              if (Array.isArray(value) && value.length > 0) {
                if (field === "email") {
                  return "That email is already registered. Try signing in.";
                }
                return `${field}: ${value[0]}`;
              }

              // Step 4a: If backend returns nested objects (rare), stringify safely
              try {
                return `${field}: ${JSON.stringify(value)}`;
              } catch {
                return `${field}: ${String(value)}`;
              }
            })
            .join(" • ");

          setError(messages);
          return;
        }
      }

      // Step 5: Fallbacks
      setError(data?.detail || "Registration failed. Check backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardSubtitle>Register, then sign in to select your organization.</CardSubtitle>
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

          <div className="space-y-2">
            <label className="block text-sm">Password</label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 pr-10"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((v) => !v)}
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                className={[
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1",
                  "text-gray-400 hover:text-white",
                  "opacity-90 hover:opacity-100",
                  "focus:outline-none focus:ring-2 focus:ring-white/10",
                ].join(" ")}
              >
                {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm">Confirm Password</label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 pr-10"
                type={isConfirmPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setIsConfirmPasswordVisible((v) => !v)}
                aria-label={isConfirmPasswordVisible ? "Hide password" : "Show password"}
                className={[
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1",
                  "text-gray-400 hover:text-white",
                  "opacity-90 hover:opacity-100",
                  "focus:outline-none focus:ring-2 focus:ring-white/10",
                ].join(" ")}
              >
                {isConfirmPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full">
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