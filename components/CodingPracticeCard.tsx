"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CodingPracticeCard({ userId }: { userId: string }) {
  const [sessionsUsed, setSessionsUsed] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    fetch(`/api/coding-session-limit?userId=${userId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSessionsUsed(data.sessions_used || 0))
      .catch((err) => console.error("Failed to fetch coding sessions", err));
  }, [userId]);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#FF6B2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Coding Practice
        </h2>
        {sessionsUsed !== null && (
          <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2.5 py-1 rounded-full border border-zinc-700/50">
            {sessionsUsed} sessions used
          </span>
        )}
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
        Practice real DSA problems from top companies
      </p>
      <Link
        href="/practice"
        className="mt-6 block w-full rounded-xl border border-zinc-700 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-[#FF6B2B]/50 hover:bg-zinc-800"
      >
        Start Practicing
      </Link>
    </div>
  );
}
