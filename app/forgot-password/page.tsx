"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app">
      <div className="w-full max-w-sm bg-bg-surface rounded-xl border border-border p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold font-ui" aria-label="MESkit">
            <span className="text-text-primary">MES</span>
            <span className="text-accent">kit</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Reset your password
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-text-secondary">
              Check your email for a password reset link. If you don&apos;t see
              it, check your spam folder.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm text-accent hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
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

              {error && <p className="text-sm text-error">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Remember your password?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
