"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") ? next : "/build";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
  }

  const signupHref = next && next.startsWith("/") ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div className="w-full max-w-sm bg-bg-surface rounded-xl border border-border p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold font-ui" aria-label="MESkit">
          <span className="text-text-primary">MES</span>
          <span className="text-[var(--accent)]">kit</span>
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          AI-Native Manufacturing Execution System
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-error">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href={signupHref} className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
