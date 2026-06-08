"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        alert("Password updated successfully! You can now log in.");
        router.push("/login");
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
          <h1 className="text-2xl font-bold text-white mb-2">Update Password</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Please enter your new password below.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleUpdate}>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                New Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#FF6B2B] py-3 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 mt-6"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
