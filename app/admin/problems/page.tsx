"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";

export default function AdminProblemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<any[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // State for editable fields per problem
  const [testCases, setTestCases] = useState<Record<string, string>>({});
  const [starterCode, setStarterCode] = useState<Record<string, string>>({});
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAdmin(user.id)) {
        router.push("/dashboard");
        return;
      }
      
      await fetchProblems();
      setLoading(false);
    }
    
    checkAdminAndFetch();
  }, [router, supabase]);

  async function fetchProblems() {
    // Assuming status defaults to 'pending' or null. The prompt specified "where status='pending'".
    const { data, error } = await supabase
      .from("raw_problems_extracted")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      // Try fetching rows where status is null if 'pending' doesn't match
      const { data: fallbackData } = await supabase
        .from("raw_problems_extracted")
        .select("*")
        .is("status", null)
        .order("created_at", { ascending: false });
        
      if (fallbackData) {
        setProblems(fallbackData);
        initializeEditableFields(fallbackData);
      } else {
        console.error("Error fetching problems:", error);
      }
    } else if (data) {
      setProblems(data);
      initializeEditableFields(data);
    }
  }

  function initializeEditableFields(data: any[]) {
    const defaultTestCases = `[{"input": "example input", "output": "expected output"}]`;
    const defaultStarterCode = `def solution():\n    # Write your solution here\n    pass`;
    
    const newTestCases: Record<string, string> = {};
    const newStarterCode: Record<string, string> = {};
    
    data.forEach(p => {
      newTestCases[p.id] = defaultTestCases;
      newStarterCode[p.id] = defaultStarterCode;
    });
    
    setTestCases(newTestCases);
    setStarterCode(newStarterCode);
  }

  async function handleRunIngest() {
    setIsIngesting(true);
    try {
      const res = await fetch("/api/cron/ingest-problems");
      const data = await res.json();
      alert(`Ingest complete. Inserted: ${data.inserted || 0}`);
    } catch (e) {
      alert("Failed to run ingest.");
    } finally {
      setIsIngesting(false);
    }
  }

  async function handleRunExtract() {
    setIsExtracting(true);
    try {
      const res = await fetch("/api/cron/extract-problems");
      const data = await res.json();
      alert(`Extract complete. Extracted: ${data.extracted || 0}, Skipped: ${data.skipped || 0}`);
      await fetchProblems(); // Refresh the list
    } catch (e) {
      alert("Failed to run extract.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleReject(id: string) {
    try {
      const { error } = await supabase
        .from("raw_problems_extracted")
        .update({ status: "rejected" })
        .eq("id", id);
        
      if (error) throw error;
      setProblems(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      alert("Failed to reject problem: " + e.message);
    }
  }

  async function handlePublish(problem: any) {
    try {
      const payload = {
        ...problem,
        test_cases_json: testCases[problem.id],
        starter_code: starterCode[problem.id]
      };
      
      const res = await fetch("/api/admin/publish-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to publish");
      }
      
      setProblems(prev => prev.filter(p => p.id !== problem.id));
    } catch (e: any) {
      alert("Failed to publish problem: " + e.message);
    }
  }

  const getDifficultyClass = (difficulty: string) => {
    if (difficulty === "Easy") return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
    if (difficulty === "Hard") return "border-red-500/30 text-red-400 bg-red-500/10";
    return "border-yellow-500/30 text-yellow-400 bg-yellow-500/10";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#FF6B2B]/30">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight inline-block hover:opacity-80 transition-opacity flex items-center gap-2">
            <div>
              <span className="text-[#FF6B2B]">Hacker</span>
              <span className="text-white">Compliment</span>
            </div>
            <span className="text-zinc-500 font-normal">Admin</span>
          </Link>
          <span className="rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 px-3 py-1 text-xs font-semibold text-[#FF6B2B]">
            Problem Review ({problems.length} pending)
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.back()}
            className="rounded-xl bg-zinc-800 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-zinc-700"
          >
            &larr; Back
          </button>
          <button
            onClick={handleRunIngest}
            disabled={isIngesting}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isIngesting ? "Ingesting..." : "Run Ingest"}
          </button>
          <button
            onClick={handleRunExtract}
            disabled={isExtracting}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isExtracting ? "Extracting..." : "Run Extract"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {problems.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            No pending problems to review. Run Ingest and Extract to find new ones.
          </div>
        ) : (
          problems.map(problem => (
            <div key={problem.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl flex flex-col md:flex-row gap-6">
              
              {/* Left Side: Problem Details */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold">{problem.title}</h2>
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
                    {problem.company || "Unknown"}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDifficultyClass(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(problem.tags || []).map((tag: string) => (
                    <span key={tag} className="rounded-md bg-zinc-800/50 px-2 py-1 text-xs text-zinc-400">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Description</h3>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{problem.description}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Examples</h3>
                  <pre className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800 whitespace-pre-wrap font-mono">
                    {problem.examples}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Constraints</h3>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{problem.constraints}</p>
                </div>
              </div>

              {/* Right Side: Editable Config & Actions */}
              <div className="w-full md:w-96 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-zinc-800 pt-6 md:pt-0 md:pl-6">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider block">
                    Test Cases (JSON)
                  </label>
                  <textarea
                    value={testCases[problem.id]}
                    onChange={(e) => setTestCases({ ...testCases, [problem.id]: e.target.value })}
                    className="w-full h-32 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm font-mono text-zinc-300 focus:border-[#FF6B2B] focus:outline-none custom-scrollbar"
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider block">
                    Starter Code (Python)
                  </label>
                  <textarea
                    value={starterCode[problem.id]}
                    onChange={(e) => setStarterCode({ ...starterCode, [problem.id]: e.target.value })}
                    className="w-full h-32 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm font-mono text-zinc-300 focus:border-[#FF6B2B] focus:outline-none custom-scrollbar"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleReject(problem.id)}
                    className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handlePublish(problem)}
                    className="flex-1 rounded-xl bg-[#FF6B2B] py-3 text-sm font-bold text-black transition-all hover:scale-105 hover:brightness-110 shadow-[0_0_15px_rgba(255,107,43,0.3)]"
                  >
                    Publish
                  </button>
                </div>
              </div>
              
            </div>
          ))
        )}
      </main>
    </div>
  );
}
