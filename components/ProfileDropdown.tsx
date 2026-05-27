"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ProfileDropdown({ 
  name, 
  email, 
  initials, 
  plan 
}: { 
  name: string, 
  email: string, 
  initials: string, 
  plan: string 
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setProfileOpen(!profileOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B2B] text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 focus:outline-none"
      >
        {initials}
      </button>

      {profileOpen && (
        <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
          <div className="mb-3 px-2">
            <p className="font-bold text-white truncate">{name}</p>
            <p className="text-xs text-zinc-400 truncate">{email}</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
              plan === "Free" ? "bg-zinc-800 text-zinc-400" : "bg-[#FF6B2B]/20 text-[#FF6B2B]"
            }`}>
              {plan} Plan
            </span>
          </div>
          
          <div className="my-2 h-px bg-zinc-800" />
          
          <div className="flex flex-col gap-1">
            <Link onClick={() => setProfileOpen(false)} href="/dashboard" className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">🏠 Dashboard</Link>
            <Link onClick={() => setProfileOpen(false)} href="/profile" className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">👤 My Profile</Link>
            <Link onClick={() => setProfileOpen(false)} href="/interview" className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">🎯 Start Interview</Link>
            <Link onClick={() => setProfileOpen(false)} href="/resume" className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">📄 Resume Analyzer</Link>
            <Link onClick={() => setProfileOpen(false)} href="/history" className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">📊 History</Link>
            <Link onClick={() => setProfileOpen(false)} href="/pricing" className="rounded-lg px-3 py-2 text-sm text-[#FF6B2B] transition-colors hover:bg-zinc-800">💳 Upgrade Plan</Link>
          </div>
          
          <div className="my-2 h-px bg-zinc-800" />
          
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-zinc-800"
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
