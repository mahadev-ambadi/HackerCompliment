"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

function Logo() {
  return (
    <Link href="/" className="text-xl font-bold tracking-tight">
      <span className="text-[#FF6B2B]">Hacker</span>
      <span className="text-white">Compliment</span>
    </Link>
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/30";

export default function ForgotPasswordPage() {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#FF6B2B]/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-6 text-center text-sm text-emerald-400">
              <span className="text-4xl block mb-3">✅</span>
              Check your email for the password reset link!
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleReset}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@college.edu"
                  className={inputClass}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#FF6B2B] py-3 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 mt-6"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-[#FF6B2B] hover:text-[#FF6B2B]">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
