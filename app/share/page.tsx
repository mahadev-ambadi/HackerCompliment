"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ShareExperiencePage() {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("raw_experiences")
        .insert({
          source: "user_submission",
          content: content.trim(),
          status: "pending",
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setContent("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit your experience. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-[#FF6B2B]/30 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight inline-block hover:opacity-80 transition-opacity">
              <span className="text-[#FF6B2B]">Hacker</span>
              <span className="text-white">Compliment</span>
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
              Community
            </span>
          </div>
        </div>
      </header>

      <main className="py-8 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-[#FF6B2B] px-5 py-2 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:brightness-110"
          >
            &larr; Back
          </Link>
        </div>
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black text-white mb-4">Share Your Experience</h1>
            <p className="text-lg text-zinc-400">
              Help others prepare by sharing the questions you were asked in your recent tech interviews.
              Our AI will extract the questions and add them to the global practice database.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 sm:p-12 shadow-2xl">
            {success ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500 ring-4 ring-green-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
                <p className="text-zinc-400 mb-8 max-w-md">
                  Your interview experience has been submitted. Our AI will review and extract the questions to help the community.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-3 font-semibold text-white transition-all hover:bg-zinc-700 hover:border-zinc-600"
                >
                  Share Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-zinc-300 mb-2">
                    Interview Details & Questions
                  </label>
                  <textarea
                    id="experience"
                    required
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="e.g. I interviewed at Google for a Senior Frontend role. The technical round focused on React performance. They asked me to build a custom hook that..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-white placeholder-zinc-600 focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B]/30 focus:outline-none custom-scrollbar resize-y"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Please include the company name, role, and the specific questions you were asked.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="w-full rounded-xl bg-[#FF6B2B] py-4 text-base font-bold text-black transition-all duration-200 hover:scale-[1.02] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Experience"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
