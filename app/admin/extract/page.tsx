"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/admin";
import { useRouter } from "next/navigation";

type Question = {
  question: string;
  interview_type: string;
  difficulty: string;
  tags?: string[];
};

type ExtractResult = {
  inserted: number;
  skipped: number;
  questions: Question[];
};

export default function AdminExtractPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isAdmin(user.id)) {
        router.push("/dashboard");
      } else {
        setAllowed(true);
      }
    });
  }, [router]);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState("");
  const [rawContent, setRawContent] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim() || !rawContent.trim()) {
      setError("Company, Role, and Raw Content are required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          sourcePlatform: sourcePlatform.trim() || undefined,
          rawContent: rawContent.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to extract questions");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  function getDifficultyColor(diff: string) {
    switch (diff?.toLowerCase()) {
      case "easy": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "hard": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  }

  function getTypeColor(type: string) {
    switch (type?.toLowerCase()) {
      case "hr": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "behavioral": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
    }
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12 font-sans selection:bg-[#FF6B2B]/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Extract Interview Questions</h1>
          <p className="text-zinc-400">
            Paste raw interview experiences here to automatically extract and catalog genuine questions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900/50 p-6 sm:p-8 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Company Name *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B] transition-colors"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Role *</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Engineer"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B] transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Source Platform (Optional)</label>
            <input
              type="text"
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              placeholder="e.g. Glassdoor, LeetCode, GFG"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Raw Interview Content *</label>
            <textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Paste the full interview experience here..."
              rows={12}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B] transition-colors resize-y font-mono text-sm"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-[#FF6B2B] text-black font-semibold rounded-xl px-8 py-3.5 hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Extraction...
                </>
              ) : (
                "Extract Questions"
              )}
            </button>
          </div>
        </form>

        {result && (
          <div className="bg-zinc-900/80 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800">
              <div className="bg-emerald-500/10 p-2 rounded-full text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Extraction Complete</h3>
                <p className="text-zinc-400 text-sm mt-0.5">
                  <span className="text-emerald-400 font-medium">{result.inserted} inserted</span> into the database, <span className="text-zinc-500">{result.skipped} skipped</span> (duplicates).
                </p>
              </div>
            </div>

            {result.questions && result.questions.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Processed Questions</h4>
                {result.questions.map((q, i) => (
                  <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <p className="text-zinc-200 font-medium leading-relaxed mb-3">
                      {q.question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${getTypeColor(q.interview_type)}`}>
                        {q.interview_type || "Technical"}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${getDifficultyColor(q.difficulty)}`}>
                        {q.difficulty || "Medium"}
                      </span>
                      {q.tags?.map(tag => (
                        <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-md border bg-zinc-800 text-zinc-400 border-zinc-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm italic">No valid questions were extracted from this content.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
