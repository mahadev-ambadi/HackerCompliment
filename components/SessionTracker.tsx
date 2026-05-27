"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SessionTracker({ userId }: { userId: string }) {
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    
    fetch(`/api/session-limit?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setSessionInfo(data))
      .catch((err) => console.error("Failed to fetch session info", err));
  }, [userId]);

  if (!sessionInfo) return null;

  const { sessions_used = 0, bonus_credits = 0, limit = 3, remaining = 0, canStart = false } = sessionInfo;
  const percentage = Math.min(100, (sessions_used / limit) * 100);

  let colorClass = "text-[#FF6B2B]";
  let bgClass = "bg-[#FF6B2B]";
  
  if (remaining === 0) {
    colorClass = "text-red-500";
    bgClass = "bg-red-500";
  } else if (remaining === 1) {
    colorClass = "text-yellow-500";
    bgClass = "bg-yellow-500";
  }

  const isUnlimited = bonus_credits > 0 && bonus_credits >= 999;

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      {isUnlimited ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Session Access</span>
          <span className="inline-flex items-center rounded-full bg-[#FF6B2B]/10 px-3 py-1 text-xs font-semibold text-[#FF6B2B] border border-[#FF6B2B]/30">
            Unlimited Access
          </span>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Free Sessions This Week</span>
            <span className={`font-bold ${colorClass}`}>
              {sessions_used} / {limit} used
            </span>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full ${bgClass} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div>
            {remaining === 0 ? (
              <Link href="/pricing" className="text-xs text-[#FF6B2B] hover:underline">
                Limit reached. Resets Monday. Upgrade for unlimited →
              </Link>
            ) : (
              <p className="text-xs text-zinc-500">
                {remaining} session(s) remaining · Resets every Monday
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
