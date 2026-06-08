"use client";

import Link from "next/link";
import { useState } from "react";

export default function MockInterviewPage() {
  const [step, setStep] = useState<"setup" | "interview">("setup");

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-[#FF6B2B]/30 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-black text-white hover:text-[#FF6B2B] transition-colors">
              HackerCompliment
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
              Mock Interview
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
        <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-4">Comprehensive Mock Interview</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            This module is currently under construction. Soon, you'll be able to take full-length behavioral and system design mock interviews here!
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center flex flex-col items-center justify-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] ring-4 ring-[#FF6B2B]/5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.376c.356-.484.228-1.151-.274-1.502C12.333 9.4 10.985 9 9.5 9c-3.038 0-5.5 2.462-5.5 5.5 0 1.485.4 2.833 1.092 3.938.351.502 1.018.63 1.502.274l3.376-2.492zm0 0l-3.376 2.492c-.484.356-1.151.228-1.502-.274C5.85 16.284 5.5 14.936 5.5 13.45c0-3.038 2.462-5.5 5.5-5.5 1.485 0 2.833.4 3.938 1.092.502.351.63 1.018.274 1.502l-2.492 3.376z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Coming Soon</h2>
          <p className="text-zinc-400 mb-8 max-w-md">
            We are designing the new isolated Mock Interview page. Check back shortly as we build out this feature.
          </p>
          <Link href="/dashboard" className="rounded-xl bg-[#FF6B2B] px-8 py-3 font-bold text-black transition-all hover:scale-105 hover:brightness-110">
            Return to Dashboard
          </Link>
        </div>
        </div>
      </main>
    </div>
  );
}
