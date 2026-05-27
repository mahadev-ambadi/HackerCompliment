"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

const targetCompanies = [
  "TCS",
  "Wipro",
  "Infosys",
  "Amazon",
  "Google",
  "Deloitte",
  "Accenture",
  "Cognizant",
  "Other",
];

function Logo() {
  return (
    <Link href="/" className="text-xl font-bold tracking-tight">
      <span className="text-[#FF6B2B]">Hacker</span>
      <span className="text-white">Compliment</span>
    </Link>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-zinc-800" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-zinc-900/80 px-3 text-zinc-500">or continue with email</span>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/30";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) alert('Google sign-in failed: ' + error.message)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!targetCompany) {
      setError("Please select a target company.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          college: college || null,
          target_company: targetCompany,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setError("Check your email to confirm your account before logging in.");
    setLoading(false);
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
          <h1 className="text-2xl font-bold text-white">Start Your Free Journey</h1>
          <p className="mt-2 text-sm text-zinc-400">3 free interview sessions every week</p>

          {error && (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                error.includes("Check your email")
                  ? "border-[#FF6B2B]/30 bg-[#FF6B2B]/10 text-[#FF6B2B]"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting..." : "Sign up with Google"}
            </button>
          </div>

          <Divider />

          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Your full name"
                className={inputClass}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>

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
                disabled={loading || googleLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Create a strong password"
                className={inputClass}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading || googleLoading}
              />
            </div>

            <div>
              <label htmlFor="college" className="mb-1.5 block text-sm font-medium text-zinc-300">
                College / University{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                id="college"
                type="text"
                placeholder="e.g. IIT Delhi, VIT, Anna University"
                className={inputClass}
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                disabled={loading || googleLoading}
              />
            </div>

            <div>
              <label htmlFor="targetCompany" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Target Company
              </label>
              <select
                id="targetCompany"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                required
                disabled={loading || googleLoading}
                className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
              >
                <option value="" disabled className="bg-zinc-900">
                  Select your target company
                </option>
                {targetCompanies.map((company) => (
                  <option key={company} value={company} className="bg-zinc-900">
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-xl bg-[#FF6B2B] py-3 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#FF6B2B] hover:text-[#FF6B2B]">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
