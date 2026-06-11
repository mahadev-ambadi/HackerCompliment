"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface InterviewCardProps {
  userId: string;
  title: string;
  description: string;
  href: string;
  label: string;
  primary: boolean;
}

export default function InterviewCard({ userId, title, description, href, label, primary }: InterviewCardProps) {
  const [sessionsUsed, setSessionsUsed] = useState<number | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      fetch(`/api/session-limit?userId=${userId}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setSessionsUsed(data.sessions_used || 0);
        })
        .catch((err) => console.error("Failed to fetch interview session info", err));
    }

    fetchInfo();
  }, [userId]);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-700 bg-black/60 p-6 shadow-2xl backdrop-blur-lg transition-transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {sessionsUsed !== null && (
          <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2.5 py-1 rounded-full border border-zinc-700/50">
            {sessionsUsed} sessions used
          </span>
        )}
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
      <Link
        href={href}
        className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
          primary
            ? "bg-[#FF6B2B] text-black transition-all duration-200 hover:scale-105 hover:brightness-110"
            : "border border-zinc-700 text-white hover:border-[#FF6B2B]/50 hover:bg-zinc-800"
        }`}
      >
        {label}
      </Link>
    </div>
  );
}
