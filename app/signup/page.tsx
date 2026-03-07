"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") ? next : "/build";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  const loginHref = next && next.startsWith("/") ? `/login?next=${encodeURIComponent(next)}` : "/login";

  if (submitted) {
    return (
      <div className="w-full max-w-sm bg-bg-surface rounded-xl border border-border p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold font-ui" aria-label="MESkit">
            <span className="text-text-primary">MES</span>
            <span className="text-accent">kit</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">Check your email</p>
        </div>
        <div className="text-center space-y-4">
          <p className="text-sm text-text-secondary">
            We sent a confirmation link to <strong className="text-text-primary">{email}</strong>.
            Click the link to activate your account.
          </p>
          <p className="text-xs text-text-secondary">
            Didn&apos;t receive it? Check your spam folder.
          </p>
          <Link
            href={loginHref}
            className="inline-block text-sm text-accent hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-bg-surface rounded-xl border border-border p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold font-ui" aria-label="MESkit">
          <span className="text-text-primary">MES</span>
          <span className="text-accent">kit</span>
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Create your account
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
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-app text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-app text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href={loginHref} className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app">
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
