"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Editor from "@monaco-editor/react";

type Step = "setup" | "coding" | "results";
type Difficulty = "Easy" | "Medium" | "Hard";
type Language = "Python" | "Java" | "C++";

const MOCK_PROBLEMS = {
  Easy: {
    title: "Two Sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
    constraints: "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9",
    starterCode: {
      Python: "def twoSum(nums, target):\n    # Write your code here\n    pass",
      Java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n    }\n}",
      "C++": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n    }\n};"
    }
  },
  Medium: {
    title: "LRU Cache",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the LRUCache class:\n- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.\n- int get(int key) Return the value of the key if the key exists, otherwise return -1.\n- void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.",
    examples: "Input\n[\"LRUCache\", \"put\", \"put\", \"get\", \"put\", \"get\", \"put\", \"get\", \"get\", \"get\"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]\nOutput\n[null, null, null, 1, null, -1, null, -1, 3, 4]",
    constraints: "- 1 <= capacity <= 3000\n- 0 <= key <= 10^4\n- 0 <= value <= 10^5",
    starterCode: {
      Python: "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n\n    def get(self, key: int) -> int:\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        pass",
      Java: "class LRUCache {\n    public LRUCache(int capacity) {\n        \n    }\n    \n    public int get(int key) {\n        \n    }\n    \n    public void put(int key, int value) {\n        \n    }\n}",
      "C++": "class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        \n    }\n    \n    int get(int key) {\n        \n    }\n    \n    void put(int key, int value) {\n        \n    }\n};"
    }
  },
  Hard: {
    title: "Median of Two Sorted Arrays",
    description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).",
    examples: "Input: nums1 = [1,3], nums2 = [2]\nOutput: 2.00000\nExplanation: merged array = [1,2,3] and median is 2.",
    constraints: "- nums1.length == m\n- nums2.length == n\n- 0 <= m <= 1000\n- 0 <= n <= 1000\n- 1 <= m + n <= 2000",
    starterCode: {
      Python: "def findMedianSortedArrays(nums1, nums2):\n    # Write your code here\n    pass",
      Java: "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Write your code here\n    }\n}",
      "C++": "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        // Write your code here\n    }\n};"
    }
  }
};

const TOP_COMPANIES = [
  "Google", "Meta", "Amazon", "Apple", "Netflix", "Microsoft",
  "TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Capgemini",
  "Flipkart", "Swiggy", "Zomato", "Paytm", "Oracle", "Adobe", 
  "Atlassian", "Uber", "Cisco", "IBM", "Salesforce", "Goldman Sachs"
];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const LANGUAGES: Language[] = ["Python", "Java", "C++"];

export default function PracticePage() {
  const [step, setStep] = useState<Step>("setup");
  const [userId, setUserId] = useState<string | null>(null);

  // Setup State
  const [company, setCompany] = useState("Google");
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [language, setLanguage] = useState<Language>("Python");
  
  // Ref for clicking outside the custom dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Gating State
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [shouldBlock, setShouldBlock] = useState(false);

  useEffect(() => {
    if (!userId) return;
    async function checkLimit() {
      try {
        const headers = await getSessionAuthHeaders();
        const res = await fetch(`/api/session-limit?userId=${userId}`, {
          credentials: "include",
          headers,
          cache: "no-store",
        });
        const data = await res.json();
        setSessionInfo(data);
        if (!data.canStart) {
          setShouldBlock(true);
        } else {
          setShouldBlock(false);
        }
      } catch (err) {
        console.error("Failed to fetch session usage:", err);
      } finally {
        setSessionsLoading(false);
      }
    }
    checkLimit();
  }, [userId]);

  // Editor State
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Evaluation State
  const [evaluation, setEvaluation] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Sync starter code when language/difficulty changes
  useEffect(() => {
    if (step === "setup") {
      setCode(MOCK_PROBLEMS[difficulty].starterCode[language]);
    }
  }, [difficulty, language, step]);

  useEffect(() => {
    if (step !== "coding" || isSubmitting) return;
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, isSubmitting]);

  async function getSessionAuthHeaders() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  }

  async function handleStartPractice() {
    setSessionsLoading(true);
    try {
      const headers = await getSessionAuthHeaders();
      const res = await fetch(`/api/session-limit?userId=${userId}`, {
        credentials: "include",
        headers,
        cache: "no-store"
      });
      const data = await res.json();
      
      if (!data.canStart) {
        setShouldBlock(true);
        setSessionsLoading(false);
        return;
      }
      
      setShouldBlock(false);
      setStep("coding");
      setElapsedTime(0);
      setOutput("");
      setEvaluation(null);
    } catch (err) {
      console.error("Failed to check limits", err);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleRunCode() {
    setIsRunning(true);
    setOutput("Executing code...");
    try {
      const res = await fetch("/api/execute-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId: MOCK_PROBLEMS[difficulty].title
        })
      });
      const data = await res.json();
      setOutput(data.output || "Execution completed with no output.");
    } catch (err) {
      setOutput("Network Error: Failed to execute code.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmitCode() {
    setIsSubmitting(true);
    try {
      // 1. Evaluate Code
      const res = await fetch("/api/evaluate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problem: {
            title: MOCK_PROBLEMS[difficulty].title,
            difficulty,
            company
          },
          output,
          runtime: elapsedTime
        })
      });
      
      const evalData = await res.json();
      
      if (!res.ok || evalData.error) {
        throw new Error(evalData.error || "Failed to communicate with AI.");
      }
      
      setEvaluation(evalData);

      // 2. Increment Session
      if (userId) {
        const headers = await getSessionAuthHeaders();
        await fetch("/api/session-limit", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ userId })
        });

        // 3. Save Submission (mocking DB insert for now since table doesn't explicitly exist yet)
        const supabase = createClient();
        const { error } = await supabase.from("submissions").insert({
          user_id: userId,
          company,
          problem_title: MOCK_PROBLEMS[difficulty].title,
          language,
          code,
          score: evalData.score || 0
        });
        
        if (error) {
          console.log("Failed to insert submission, table may not exist yet:", error);
        }
      }

      setStep("results");
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const monacoLanguage = useMemo(() => {
    switch (language) {
      case "Python": return "python";
      case "Java": return "java";
      case "C++": return "cpp";
      default: return "javascript";
    }
  }, [language]);

  return (
    <div 
      className="h-screen overflow-hidden text-white selection:bg-[#FF6B2B]/30 font-sans bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-0.5 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/logo-colored.png" alt="Logo" className="h-7 w-auto sm:h-8 -mr-1" />
              <div className="flex">
                <span className="text-white">Hacker</span>
                <span className="text-[#FF6B2B]">Compliment</span>
              </div>
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
              Coding Practice
            </span>
          </div>
          {step === "coding" && (
            <div className="flex items-center gap-6">
              <div className="font-mono text-sm text-zinc-400 tabular-nums">
                {formatTime(elapsedTime)}
              </div>
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
              >
                {isRunning ? "Running..." : "Run Code"}
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                className="rounded-xl bg-[#FF6B2B] px-6 py-2 text-sm font-semibold text-black transition-all hover:scale-105 hover:brightness-110 disabled:opacity-50"
              >
                {isSubmitting ? "Evaluating..." : "Submit & Evaluate"}
              </button>
              <button
                onClick={() => setStep("setup")}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-2 text-sm font-semibold text-red-500 transition-all hover:bg-red-500/20"
              >
                End Coding
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={`h-[calc(100vh-4rem)] ${step !== "coding" ? "overflow-y-auto" : ""}`}>
        {step !== "coding" && (
          <div className="mx-auto max-w-6xl px-6 pt-4 pb-2">
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-[#FF6B2B] px-5 py-2 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:brightness-110 mb-2"
            >
              &larr; Back
            </Link>
          </div>
        )}
        {step === "setup" && (
          <div className="mx-auto max-w-2xl px-6 pt-2 pb-8">
            <div className="text-center mb-6">
              <div className="inline-block bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-zinc-800/50">
                <h1 className="text-3xl font-bold text-white drop-shadow-md mb-1"><span className="text-[#FF6B2B]">Coding</span> Round</h1>
                <p className="text-sm text-zinc-300 drop-shadow-sm mb-3">Choose a company, difficulty, and your preferred language.</p>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-4 py-1.5 text-sm font-medium text-[#FF6B2B]">
                  {sessionsLoading ? (
                    "Loading session usage..."
                  ) : sessionInfo?.isUnlimitedPlan ? (
                    <>{sessionInfo.unlimitedLabel || "Unlimited Access"}</>
                  ) : sessionInfo ? (
                    <>
                      {Math.min(sessionInfo.sessions_used, sessionInfo.limit)} of {sessionInfo.limit} {sessionInfo.planName === 'free' ? 'free ' : ''}sessions used{sessionInfo.planName === 'free' ? ' this week' : ''}
                    </>
                  ) : null}
                </span>
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-zinc-700 bg-black/70 backdrop-blur-lg p-6 shadow-2xl">
              <div className="space-y-3" ref={dropdownRef}>
                <label className="text-sm font-semibold text-zinc-100">Target Company</label>
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        setIsCompanyDropdownOpen(true);
                      }}
                      onFocus={() => setIsCompanyDropdownOpen(true)}
                      placeholder="Type a company..."
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-left text-white focus:border-[#FF6B2B] focus:outline-none placeholder-zinc-500"
                    />
                    <svg className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {isCompanyDropdownOpen && (
                    <div className="absolute top-full left-0 z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 py-2 shadow-2xl custom-scrollbar">
                      {TOP_COMPANIES.filter(c => c.toLowerCase().includes(company.toLowerCase())).length > 0 ? (
                        TOP_COMPANIES.filter(c => c.toLowerCase().includes(company.toLowerCase())).map(c => (
                          <button
                            key={c}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCompany(c);
                              setIsCompanyDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-zinc-800 hover:text-[#FF6B2B] ${
                              company === c ? "bg-[#FF6B2B]/10 text-[#FF6B2B] font-semibold" : "text-zinc-300"
                            }`}
                          >
                            {c}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-zinc-500 text-center italic">Use "{company}" as custom company</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-100">Difficulty</label>
                <div className="grid grid-cols-3 gap-3">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                        difficulty === d 
                          ? "border-[#FF6B2B] bg-[#FF6B2B]/10 text-[#FF6B2B]" 
                          : "border-zinc-700 bg-zinc-950/80 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-100">Language</label>
                <div className="grid grid-cols-3 gap-3">
                  {LANGUAGES.map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                        language === l 
                          ? "border-[#FF6B2B] bg-[#FF6B2B]/10 text-[#FF6B2B]" 
                          : "border-zinc-700 bg-zinc-950/80 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {shouldBlock && (
                <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-center">
                  You've used all {sessionInfo?.limit} of your free sessions this week.<br />
                  <Link href="/pricing" className="text-[#FF6B2B] underline font-bold mt-1 inline-block">Upgrade to Pro</Link> for unlimited practice.
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={handleStartPractice}
                  disabled={sessionsLoading || shouldBlock}
                  className="w-full rounded-xl bg-[#FF6B2B] px-4 py-4 font-bold text-black transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {sessionsLoading ? "Checking Limits..." : "Start Practice"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "coding" && (
          <div className="flex h-full flex-col lg:flex-row">
            {/* Left Pane: Problem Description */}
            <div className="flex-1 overflow-y-auto border-r border-zinc-700 bg-black/60 shadow-2xl backdrop-blur-lg p-6 lg:max-w-xl xl:max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-white">
                  {company}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  difficulty === "Easy" ? "border-emerald-500/30 text-emerald-400" :
                  difficulty === "Hard" ? "border-red-500/30 text-red-400" :
                  "border-yellow-500/30 text-yellow-400"
                }`}>
                  {difficulty}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-6">{MOCK_PROBLEMS[difficulty].title}</h1>
              
              <div className="prose prose-invert max-w-none">
                <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm">
                  {MOCK_PROBLEMS[difficulty].description}
                </div>
                
                <h3 className="text-white mt-8 mb-4 font-semibold">Examples</h3>
                <pre className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300 whitespace-pre-wrap">
                  {MOCK_PROBLEMS[difficulty].examples}
                </pre>
                
                <h3 className="text-white mt-8 mb-4 font-semibold">Constraints</h3>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                  {MOCK_PROBLEMS[difficulty].constraints}
                </div>
              </div>
            </div>

            {/* Right Pane: Editor & Output */}
            <div className="flex flex-1 flex-col h-full bg-[#1e1e1e]">
              <div className="flex-1 min-h-[50vh]">
                <Editor
                  height="100%"
                  language={monacoLanguage}
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 24 },
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  }}
                />
              </div>
              
              <div className="h-64 border-t border-zinc-700 bg-black/80 backdrop-blur-lg flex flex-col">
                <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Console Output</span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
                  {output ? (
                    <pre className="text-zinc-300 whitespace-pre-wrap">{output}</pre>
                  ) : (
                    <span className="text-zinc-600 italic">Run your code to see output...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "results" && evaluation && (
          <div className="mx-auto max-w-4xl px-6 py-12 overflow-y-auto h-full">
            <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-4xl font-black text-white">Evaluation Complete</h1>
              <p className="mt-2 text-zinc-400">Here's how you did on {MOCK_PROBLEMS[difficulty].title}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Score Card */}
              <div className="rounded-3xl border border-zinc-700 bg-black/60 shadow-2xl backdrop-blur-lg p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-[#FF6B2B]/10 blur-3xl rounded-full" />
                <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 relative z-10">Overall Score</span>
                <div className="relative z-10 flex items-baseline gap-1">
                  <span className="text-7xl font-black text-[#FF6B2B]">{evaluation.score}</span>
                  <span className="text-2xl text-zinc-500 font-bold">/100</span>
                </div>
              </div>

              {/* Badges Card */}
              <div className="md:col-span-2 rounded-3xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-8 flex flex-col justify-center gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Correctness</span>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                    evaluation.correctness === "Correct" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    evaluation.correctness === "Incorrect" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  }`}>
                    {evaluation.correctness || "Unknown"}
                  </span>
                </div>
                
                <div className="h-px bg-zinc-800 w-full" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Time Complexity</span>
                    <span className="text-xl font-bold font-mono text-white">{evaluation.time_complexity || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Space Complexity</span>
                    <span className="text-xl font-bold font-mono text-white">{evaluation.space_complexity || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Strengths */}
              <div className="rounded-3xl border border-emerald-500/30 bg-black/60 shadow-xl backdrop-blur-md p-8">
                <h3 className="text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Strengths
                </h3>
                <ul className="space-y-4">
                  {(evaluation.strengths || []).map((s: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-300 leading-relaxed flex items-start gap-3">
                      <span className="text-emerald-500/50 mt-1">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="rounded-3xl border border-orange-500/30 bg-black/60 shadow-xl backdrop-blur-md p-8">
                <h3 className="text-lg font-bold text-orange-400 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Areas to Improve
                </h3>
                <ul className="space-y-4">
                  {(evaluation.improvements || []).map((s: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-300 leading-relaxed flex items-start gap-3">
                      <span className="text-orange-500/50 mt-1">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Optimized Approach & Feedback */}
            <div className="rounded-3xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-8 mb-12">
              <h3 className="text-lg font-bold text-white mb-4">Optimized Approach</h3>
              <p className="text-sm text-zinc-300 leading-relaxed mb-8">
                {evaluation.optimized_approach || "No optimized approach provided."}
              </p>
              
              <h3 className="text-lg font-bold text-white mb-4">AI Feedback</h3>
              <p className="text-sm text-zinc-300 leading-relaxed border-l-2 border-[#FF6B2B] pl-4">
                {evaluation.feedback || "No feedback provided."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-12">
              <button
                onClick={() => setStep("setup")}
                className="w-full sm:w-auto rounded-xl bg-[#FF6B2B] px-8 py-4 text-sm font-bold text-black transition-all hover:scale-105 hover:brightness-110"
              >
                Try Another Problem
              </button>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-xl border border-zinc-700 px-8 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-zinc-800"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
