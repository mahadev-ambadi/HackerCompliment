"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EvaluationResult } from "@/app/api/evaluate/route";
import { createClient } from "@/lib/supabase";

type Step = "setup" | "interview" | "results";

const companies = [
  "TCS", "Wipro", "Infosys", "Cognizant", "HCL", "Tech Mahindra", "Mphasis",
  "Hexaware", "L&T Infotech", "Persistent Systems", "NIIT Technologies", "Mindtree",
  "Mastech", "Zensar", "Cyient", "Sonata Software", "Tata Elxsi", "KPIT Technologies",
  "Flipkart", "Zomato", "Swiggy", "Paytm", "PhonePe", "Ola", "BYJU'S",
  "Meesho", "Razorpay", "Freshworks", "Zoho", "Zepto", "Cred", "Dream11", "Nykaa",
  "Policybazaar", "Lenskart", "Dunzo", "Urban Company", "BigBasket", "Udaan",
  "Groww", "Zerodha", "Upstox", "Slice", "BrowserStack", "Postman", "Chargebee",
  "Hasura", "Clevertap", "MoEngage", "Mixpanel India", "Druva", "Innovaccer",
  "Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix", "Uber",
  "Airbnb", "LinkedIn", "Twitter", "Salesforce", "Adobe", "Oracle", "IBM", "SAP",
  "Cisco", "Intel", "Qualcomm", "Texas Instruments", "Nvidia", "Atlassian",
  "Stripe", "Square", "Shopify", "Spotify", "Snap", "Pinterest", "Reddit",
  "Dropbox", "Box", "Slack", "Zoom", "HubSpot", "Workday", "ServiceNow",
  "Goldman Sachs", "JPMorgan", "Morgan Stanley", "Deutsche Bank",
  "Barclays", "HSBC", "Citi", "McKinsey", "BCG", "Bain", "Deloitte", "Accenture",
  "EY", "PwC", "KPMG", "Capgemini", "Wipro Consulting"
];

const roles = [
  // Software Development
  'Software Engineer',
  'Senior Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Mobile Developer (Android)',
  'Mobile Developer (iOS)',
  'React Native Developer',
  'Flutter Developer',

  // Data & AI
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'AI Engineer',
  'Data Engineer',
  'Business Intelligence Analyst',
  'NLP Engineer',
  'Computer Vision Engineer',

  // Cloud & DevOps
  'DevOps Engineer',
  'Cloud Engineer',
  'Site Reliability Engineer (SRE)',
  'AWS Solutions Architect',
  'Platform Engineer',
  'Infrastructure Engineer',

  // Security
  'Cybersecurity Analyst',
  'Security Engineer',
  'Penetration Tester',

  // Product & Design
  'Product Manager',
  'Associate Product Manager',
  'UI/UX Designer',
  'Product Designer',

  // Business & Consulting
  'Business Analyst',
  'Systems Analyst',
  'Management Consultant',
  'IT Consultant',
  'ERP Consultant (SAP)',
  'Salesforce Developer',

  // QA & Testing
  'QA Engineer',
  'Test Automation Engineer',
  'Manual Tester',

  // Database
  'Database Administrator',
  'Database Developer',

  // Management
  'Engineering Manager',
  'Technical Lead',
  'Scrum Master',
  'Project Manager',

  // Finance Tech
  'Quantitative Analyst',
  'Fintech Developer',

  // Support & Operations
  'Technical Support Engineer',
  'IT Support Specialist',
  'Network Engineer',
  'Systems Administrator',

  'Other'
];

const interviewTypes = ["HR Round", "Technical Round", "Behavioral Round"] as const;
const experienceLevels = ["Fresher", "1-3 Years", "3+ Years"] as const;

type InterviewType = (typeof interviewTypes)[number];
type ExperienceLevel = (typeof experienceLevels)[number];

const TOTAL_QUESTIONS = 20;
const FREE_SESSION_LIMIT = 3;

const mockQuestions: Record<InterviewType, string[]> = {
  "HR Round": [
    "Tell me about yourself and why you want to join our company.",
    "What are your strengths and weaknesses as a fresher?",
    "Why should we hire you over other candidates from your college?",
    "Where do you see yourself in five years?",
    "Do you have any questions for us about the role or company culture?",
  ],
  "Technical Round": [
    "Explain the difference between SQL and NoSQL databases with a real-world example.",
    "What is the time complexity of binary search? When would you use it?",
    "Describe how you would design a URL shortener like bit.ly.",
    "What is a REST API? How do HTTP methods map to CRUD operations?",
    "Write pseudocode to detect a cycle in a linked list and explain your approach.",
  ],
  "Behavioral Round": [
    "Describe a time when you worked under pressure to meet a deadline.",
    "Tell me about a situation where you had a conflict with a teammate. How did you resolve it?",
    "Give an example of when you took initiative without being asked.",
    "Describe a project you are most proud of and your specific contribution.",
    "Tell me about a time you failed. What did you learn from it?",
  ],
};

type AggregatedResults = {
  overall: number;
  technical: number;
  communication: number;
  problemSolving: number;
  confidence: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  wouldRecommend: boolean;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function aggregatedToSessionPayload(agg: AggregatedResults) {
  return {
    overallScore: agg.overall,
    technicalScore: agg.technical,
    communicationScore: agg.communication,
    problemSolvingScore: agg.problemSolving,
    confidenceScore: agg.confidence,
    strengths: agg.strengths,
    improvements: agg.improvements,
    detailedFeedback: agg.detailedFeedback,
    wouldRecommend: agg.wouldRecommend,
  };
}

function aggregateEvaluations(evals: EvaluationResult[]): AggregatedResults {
  if (evals.length === 0) {
    return {
      overall: 0,
      technical: 0,
      communication: 0,
      problemSolving: 0,
      confidence: 0,
      strengths: [],
      improvements: ["No answers were provided during the interview."],
      detailedFeedback: "Interview ended without any responses from the candidate.",
      wouldRecommend: false,
    };
  }

  const count = evals.length;
  const avg = (fn: (e: EvaluationResult) => number) =>
    Math.round(evals.reduce((sum, e) => sum + fn(e), 0) / count);

  const allStrengths = [...new Set(evals.flatMap((e) => e.strengths))].slice(0, 3);
  const allImprovements = [...new Set(evals.flatMap((e) => e.improvements))].slice(0, 3);
  const detailedFeedback = evals.map((e) => e.detailedFeedback).filter(Boolean).join(" ");
  const recommendCount = evals.filter((e) => e.wouldRecommend).length;

  return {
    overall: avg((e) => e.overallScore),
    technical: avg((e) => e.technicalScore),
    communication: avg((e) => e.communicationScore),
    problemSolving: avg((e) => e.problemSolvingScore),
    confidence: avg((e) => e.confidenceScore),
    strengths: allStrengths.length > 0 ? allStrengths : ["Keep practicing to build strengths"],
    improvements:
      allImprovements.length > 0 ? allImprovements : ["Continue refining your interview answers"],
    detailedFeedback:
      detailedFeedback || "Complete more questions to receive detailed AI feedback.",
    wouldRecommend: recommendCount >= Math.ceil(count / 2),
  };
}

function getScoreColor(score: number) {
  if (score < 50) return "text-red-400";
  if (score < 70) return "text-yellow-400";
  return "text-[#FF6B2B]";
}

function getScoreBorder(score: number) {
  if (score < 50) return "border-red-500/30 bg-red-500/10";
  if (score < 70) return "border-yellow-500/30 bg-yellow-500/10";
  return "border-[#FF6B2B]/30 bg-[#FF6B2B]/10";
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/30 disabled:cursor-not-allowed disabled:opacity-60";

const selectClass = `${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`;

function OptionButtons<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${selected === option
              ? "border-[#FF6B2B] bg-[#FF6B2B]/15 text-[#FF6B2B]"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
            }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function InterviewPage() {
  const [step, setStep] = useState<Step>("setup");
  const [company, setCompany] = useState(companies[0]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [role, setRole] = useState(roles[0]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [interviewType, setInterviewType] = useState<InterviewType>("Technical Round");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("Fresher");

  const filteredCompanies = useMemo(() => {
    if (!company) return companies;
    return companies.filter(c => c.toLowerCase().includes(company.toLowerCase()));
  }, [company]);

  const filteredRoles = useMemo(() => {
    if (!role) return roles;
    return roles.filter(r => r.toLowerCase().includes(role.toLowerCase()));
  }, [role]);

  const [sessionLimitReached, setSessionLimitReached] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWaiting, setIsWaiting] = useState(true);

  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [results, setResults] = useState<AggregatedResults | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionsUsed, setSessionsUsed] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [planName, setPlanName] = useState<string>("free");
  const [isUnlimitedPlan, setIsUnlimitedPlan] = useState<boolean>(false);
  const [planDate, setPlanDate] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const FREE_SESSION_LIMIT = 3;
  const sessionLimit = FREE_SESSION_LIMIT + bonusCredits;

  const [questions, setQuestions] = useState<string[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const currentQuestion = questions?.[questionIndex] ?? "";
  const answeredCount = evaluations.length;
  const displayProgress =
    step === "interview"
      ? ((questionIndex + (evaluating ? 0 : 0)) / TOTAL_QUESTIONS) * 100
      : 100;

  const shouldBlockInterview = !hasPlan && sessionsUsed >= sessionLimit;

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG Session Limits]:", {
        hasPlan,
        sessionsUsed,
        sessionLimitReached,
        shouldBlockInterview,
        sessionLimit,
        bonusCredits,
        planName,
        isUnlimitedPlan
      });
    }
  }, [hasPlan, sessionsUsed, sessionLimitReached, shouldBlockInterview, sessionLimit, bonusCredits, planName, isUnlimitedPlan]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function checkLimit() {
      setCheckingLimit(true);
      try {
        const authHeaders = await getSessionAuthHeaders();
        const res = await fetch(`/api/session-limit?userId=${userId}`, {
          credentials: "include",
          headers: authHeaders,
          cache: "no-store",
        });
        const data = await res.json();
        if (isMounted) {
          setSessionInfo(data);
          setSessionsUsed(data.sessions_used ?? 0);
          setBonusCredits(data.bonus_credits ?? 0);
          setHasPlan(data.hasPlan ?? false);
          setPlanName(data.planName?.toLowerCase() ?? "free");
          setIsUnlimitedPlan(data.isUnlimitedPlan ?? false);
          setPlanDate(data.planDate ?? null);
          setSessionLimitReached(!data.canStart);
          setCheckingLimit(false);
          setSessionsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch session limit", err);
        if (isMounted) setCheckingLimit(false);
      }
    }
    checkLimit();
    return () => { isMounted = false; };
  }, [userId]);

  async function getSessionAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  }

  async function fetchSessionUsage() {
    setSessionsLoading(true);
    try {
      const authHeaders = await getSessionAuthHeaders();
      const res = await fetch(`/api/session-limit?userId=${userId}`, {
        credentials: "include",
        headers: authHeaders,
        cache: "no-store",
      });
      const data = await res.json();
      console.log("GET /api/session-limit response:", res.status, data);

      setSessionInfo(data);
      setSessionsUsed(data.sessions_used ?? 0);
      setBonusCredits(data.bonus_credits ?? 0);
      setHasPlan(data.hasPlan ?? false);
      setPlanName(data.planName?.toLowerCase() ?? "free");
      setIsUnlimitedPlan(data.isUnlimitedPlan ?? false);
      setPlanDate(data.planDate ?? null);
      
      if (!data.canStart) {
        setSessionLimitReached(true);
      } else {
        setSessionLimitReached(false);
      }
    } catch (err) {
      console.error("Failed to fetch session usage:", err);
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    if (step === "setup") {
      fetchSessionUsage();
    }
  }, [step]);

  useEffect(() => {
    if (step !== "interview" || evaluating) return;

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [step, evaluating]);

  useEffect(() => {
    if (step !== "interview" || evaluating) return;

    setIsWaiting(true);
    const timeout = setTimeout(() => setIsWaiting(false), 1200);
    return () => clearTimeout(timeout);
  }, [step, questionIndex, evaluating]);

  async function saveSessionToDatabase(agg: AggregatedResults) {
    if (!userId) return;

    try {
      await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveSession: true,
          user_id: userId,
          company,
          role,
          interviewType,
          experienceLevel,
          duration: elapsedSeconds,
          sessionEvaluation: aggregatedToSessionPayload(agg),
        }),
      });
    } catch (err) {
      console.error("Failed to save interview session:", err);
    }
  }

  async function incrementSessionUsage(): Promise<{ success: boolean; limitReached: boolean }> {
    try {
      const authHeaders = await getSessionAuthHeaders();
      const res = await fetch("/api/session-limit", {
        method: "POST",
        credentials: "include",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
      const text = await res.text();
      let data: Record<string, any> = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (process.env.NODE_ENV === "development") {
        console.log("POST /api/session-limit response:", res.status, data);
      }

      if (data.limitReached) {
        return { success: false, limitReached: true };
      }

      if (!res.ok) {
        console.warn("Session increment non-critical failure:", data);
        return { success: false, limitReached: false };
      }

      setSessionsUsed(data.sessions_used ?? sessionsUsed + 1);
      return { success: true, limitReached: false };
    } catch (err) {
      console.warn("Non-critical background error in session increment:", err);
      return { success: false, limitReached: false };
    }
  }

  async function completeInterview(evals: EvaluationResult[]) {
    const agg = aggregateEvaluations(evals);
    setResults(agg);
    setStep("results");

    try {
      await saveSessionToDatabase(agg);
    } catch (dbError) {
      console.warn("Failed to save session to DB:", dbError);
    }

  }

  async function evaluateAnswer(answerText: string) {
    setEvalError(null);
    setEvaluating(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          answer: answerText,
          company,
          role,
          interviewType,
          experienceLevel,
          user_id: userId,
          duration: elapsedSeconds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Evaluation failed. Please try again.");
      }

      const evaluation = data as EvaluationResult;
      const updatedEvaluations = [...evaluations, evaluation];
      setEvaluations(updatedEvaluations);

      return updatedEvaluations;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Evaluation failed. Please try again.";
      setEvalError(message);
      return null;
    } finally {
      setEvaluating(false);
    }
  }

  async function handleSubmitAnswer() {
    if (evaluating) return;

    const updated = await evaluateAnswer(answer.trim());
    if (!updated) return;

    setAnswer("");
    setEvalError(null);

    if (questionIndex < TOTAL_QUESTIONS - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      await completeInterview(updated);
    }
  }

  async function handleSkipQuestion() {
    if (evaluating) return;

    const updated = await evaluateAnswer("(Question skipped — no answer provided)");
    if (!updated) return;

    setAnswer("");
    setEvalError(null);

    if (questionIndex < TOTAL_QUESTIONS - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      await completeInterview(updated);
    }
  }

  async function handleEndInterview() {
    if (evaluating) return;

    if (evaluations.length > 0) {
      await completeInterview(evaluations);
      return;
    }

    if (answer.trim()) {
      const updated = await evaluateAnswer(answer.trim());
      if (updated) {
        await completeInterview(updated);
      }
      return;
    }

    const fallbackEvaluation: EvaluationResult = {
      overallScore: 0,
      technicalScore: 0,
      communicationScore: 0,
      problemSolvingScore: 0,
      confidenceScore: 0,
      strengths: [],
      improvements: ["No answers were provided during the interview."],
      detailedFeedback: "Interview ended without any responses from the candidate.",
      wouldRecommend: false
    };

    await completeInterview([fallbackEvaluation]);
  }

  function handlePracticeAgain() {
    setQuestionIndex(0);
    setAnswer("");
    setElapsedSeconds(0);
    setEvaluations([]);
    setResults(null);
    setEvalError(null);
    setEvaluating(false);
    setStep("setup");
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function handleStartInterview() {
    if (shouldBlockInterview) return;

    setGeneratingQuestions(true);

    try {
      const url = new URL("/api/questions", window.location.origin);
      url.searchParams.append("company", company);
      url.searchParams.append("role", role);
      url.searchParams.append("interviewType", interviewType);
      if (userId) url.searchParams.append("userId", userId);
      url.searchParams.append("count", "20");

      const res = await fetch(url.toString());
      const data = await res.json();

      let fetchedQuestions = data.questions?.map((q: any) => q.question_text || q.question || q) || [];

      if (data.resetOccurred) {
        showToast("🔄 You've completed all questions for this company! Starting fresh.");
      }

      if (fetchedQuestions.length === 0) {
        // Fallback to Groq
        const groqRes = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company, role, interviewType }),
        });
        const groqData = await groqRes.json();
        fetchedQuestions = groqData.questions || [];
      }

      setQuestions(fetchedQuestions);

      // Increment session ONLY after successful question load
      const incResult = await incrementSessionUsage();
      if (incResult.limitReached) {
        setSessionLimitReached(true);
        setGeneratingQuestions(false);
        return;
      }
    } catch (err) {
      console.error("Failed to fetch/generate questions", err);
      alert("Failed to load interview questions. Please try again.");
      setGeneratingQuestions(false);
      return;
    }

    setQuestionIndex(0);
    setAnswer("");
    setElapsedSeconds(0);
    setEvaluations([]);
    setResults(null);
    setEvalError(null);
    setGeneratingQuestions(false);
    setStep("interview");
  }

  const aiStatus = evaluating
    ? "Alex is evaluating..."
    : isWaiting
      ? "AI is waiting..."
      : "Listening for your answer";

  return (
    <div className="min-h-full bg-[#09090b]">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-lg font-bold tracking-tight">
              <span className="text-[#FF6B2B]">Hacker</span>
              <span className="text-white">Compliment</span>
            </Link>
            {step !== "setup" && (
              <span className="text-xs text-zinc-500 sm:text-sm">AI Interview Simulator</span>
            )}
          </div>
        </div>
      </header>

      <main className="py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-[#FF6B2B] px-5 py-2 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:brightness-110"
          >
            &larr; Back
          </Link>
        </div>
        {step === "setup" && (
          <div className="mx-auto max-w-xl transition-opacity duration-300">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Configure Technical Round
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Set up your technical round — 20 questions with real AI evaluation.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-4 py-1.5 text-sm font-medium text-[#FF6B2B]">
                {sessionsLoading ? (
                  "Loading session usage..."
                ) : isUnlimitedPlan ? (
                  <>Unlimited Access</>
                ) : (
                  <>
                    {Math.min(sessionsUsed, sessionLimit)} of {sessionLimit} {planName === 'free' ? 'free ' : ''}sessions used{planName === 'free' ? ' this week' : ''}
                  </>
                )}
              </div>

              <div className="mt-8 space-y-6">
                <div className="relative">
                  <label htmlFor="company" className="mb-2 block text-sm font-medium text-zinc-300">
                    Company
                  </label>
                  <input
                    id="company"
                    value={company}
                    onFocus={() => setShowCompanyDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setShowCompanyDropdown(true);
                    }}
                    placeholder="Type or select a company..."
                    className={inputClass}
                    autoComplete="off"
                  />
                  {showCompanyDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((c) => (
                          <div
                            key={c}
                            onMouseDown={() => {
                              setCompany(c);
                              setShowCompanyDropdown(false);
                            }}
                            className="cursor-pointer px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            {c}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500">
                          Custom company will be added
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label htmlFor="role" className="mb-2 block text-sm font-medium text-zinc-300">
                    Role
                  </label>
                  <input
                    id="role"
                    value={role}
                    onFocus={() => setShowRoleDropdown(true)}
                    onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setShowRoleDropdown(true);
                    }}
                    placeholder="Type or select a role..."
                    className={inputClass}
                    autoComplete="off"
                  />
                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                      {filteredRoles.length > 0 ? (
                        filteredRoles.map((r) => (
                          <div
                            key={r}
                            onMouseDown={() => {
                              setRole(r);
                              setShowRoleDropdown(false);
                            }}
                            className="cursor-pointer px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            {r}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500">
                          Custom role will be added
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-300">Interview Type</p>
                  <OptionButtons
                    options={interviewTypes}
                    selected={interviewType}
                    onSelect={setInterviewType}
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-300">Experience Level</p>
                  <OptionButtons
                    options={experienceLevels}
                    selected={experienceLevel}
                    onSelect={setExperienceLevel}
                  />
                </div>

                {shouldBlockInterview && (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-orange-500/10 p-5 shadow-lg shadow-red-500/5 backdrop-blur flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-500 ring-4 ring-red-500/10">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Free Limit Reached</h3>
                    <p className="text-sm text-zinc-300 mb-5 max-w-sm">
                      You've used all {sessionLimit} of your interview sessions this week.<br />
                      Upgrade your plan to continue unlimited AI interviews.
                    </p>
                    <Link
                      href="/pricing"
                      className="rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF4B2B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-105 hover:brightness-110"
                    >
                      View Plans
                    </Link>
                  </div>
                )}

                <div className={shouldBlockInterview ? "pt-2" : "pt-4"}>
                  <button
                    type="button"
                    onClick={shouldBlockInterview ? undefined : handleStartInterview}
                    disabled={shouldBlockInterview || sessionsLoading || generatingQuestions}
                    className={`w-full rounded-xl py-4 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${shouldBlockInterview
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60"
                        : "bg-[#FF6B2B] text-black hover:scale-105 hover:brightness-110"
                      }`}
                  >
                    {generatingQuestions ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black"></span>
                        Loading Questions...
                      </>
                    ) : (
                      "Start Interview"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "interview" && (
          <div className="transition-opacity duration-300">
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-sm text-zinc-500">Interviewing for</p>
                <p className="font-semibold text-white">
                  {company} · {role}
                </p>
                <p className="text-xs text-zinc-500">
                  {interviewType} · {experienceLevel}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300">
                  Question {questionIndex + 1} of {TOTAL_QUESTIONS}
                </span>
                <span className="rounded-lg border border-zinc-700 px-3 py-1.5 font-mono text-sm text-white">
                  {formatTime(elapsedSeconds)}
                </span>
                <button
                  type="button"
                  onClick={handleEndInterview}
                  disabled={evaluating}
                  className="rounded-lg bg-red-600/90 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  End Interview
                </button>
              </div>
            </div>

            {evalError && (
              <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-red-400">{evalError}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={evaluating}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvalError(null)}
                    className="text-sm font-medium text-zinc-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-2xl">
                    🤖
                  </span>
                  <div>
                    <p className="font-semibold text-white">Alex - AI Interviewer</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`relative flex h-2 w-2 ${evaluating || isWaiting ? "" : "opacity-40"}`}>
                        {(evaluating || isWaiting) && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B2B] opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex h-2 w-2 rounded-full ${evaluating || isWaiting ? "bg-[#FF6B2B]" : "bg-zinc-600"}`}
                        />
                      </span>
                      <span className="text-xs text-[#FF6B2B]">{aiStatus}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/40 p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Current question
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-white sm:text-lg">
                    {currentQuestion}
                  </p>
                </div>
                {evaluating && (
                  <div className="mt-4 rounded-lg border border-[#FF6B2B]/20 bg-[#FF6B2B]/5 px-4 py-3 text-center text-sm text-[#FF6B2B]">
                    Alex is evaluating your answer...
                  </div>
                )}
              </div>

              <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <label htmlFor="answer" className="mb-2 text-sm font-medium text-zinc-300">
                  Your response
                </label>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={10}
                  disabled={evaluating}
                  className={`${inputClass} min-h-[200px] flex-1 resize-y`}
                />
                <p
                  className={`mt-2 text-xs ${answer.length >= 50 ? "text-[#FF6B2B]" : "text-zinc-500"}`}
                >
                  {answer.length} characters
                  {answer.length < 50 && " — aim for at least 50 characters"}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={evaluating}
                    className="flex-1 rounded-xl bg-[#FF6B2B] py-3 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {evaluating ? "Evaluating..." : "Submit Answer"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    disabled={evaluating}
                    className="text-center text-sm text-zinc-400 transition-colors hover:text-[#FF6B2B] disabled:opacity-60 sm:px-4"
                  >
                    Skip Question
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex justify-between text-xs text-zinc-500">
                <span>Interview progress · {answeredCount} evaluated</span>
                <span>{Math.round(displayProgress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#FF6B2B] transition-all duration-500 ease-out"
                  style={{
                    width: `${((questionIndex + (evaluating ? 0.5 : 0)) / TOTAL_QUESTIONS) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === "results" && results && (
          <div className="mx-auto max-w-3xl transition-opacity duration-300">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Interview Complete! 🎉
              </h1>
              <p className="mt-2 text-zinc-400">
                {company} · {role} · {interviewType}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Based on {evaluations.length} AI-evaluated answer
                {evaluations.length !== 1 ? "s" : ""}
              </p>

              <div
                className={`mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${results.wouldRecommend
                    ? "border-[#FF6B2B]/30 bg-[#FF6B2B]/10 text-[#FF6B2B]"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}
              >
                Would Recommend: {results.wouldRecommend ? "Yes" : "No"}
              </div>

              <div
                className={`mt-6 inline-flex flex-col items-center rounded-2xl border px-12 py-6 ${getScoreBorder(results.overall)}`}
              >
                <span className="text-sm font-medium text-zinc-400">Overall Score</span>
                <span className={`mt-1 text-5xl font-bold sm:text-6xl ${getScoreColor(results.overall)}`}>
                  {results.overall}
                  <span className="text-2xl text-zinc-500">/100</span>
                </span>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                AI Feedback
              </h2>
              <p className="mt-3 leading-relaxed text-zinc-300">{results.detailedFeedback}</p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Technical Knowledge", value: results.technical },
                { label: "Communication", value: results.communication },
                { label: "Problem Solving", value: results.problemSolving },
                { label: "Confidence", value: results.confidence },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
                >
                  <p className="text-sm text-zinc-400">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${getScoreColor(card.value)}`}>
                    {card.value}
                    <span className="text-base font-normal text-zinc-500">/100</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <h2 className="font-semibold text-[#FF6B2B]">Strengths</h2>
                <ul className="mt-4 space-y-2">
                  {results.strengths.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-[#FF6B2B]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <h2 className="font-semibold text-amber-400">Areas to Improve</h2>
                <ul className="mt-4 space-y-2">
                  {results.improvements.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-amber-400">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handlePracticeAgain}
                className="rounded-xl bg-[#FF6B2B] px-8 py-3 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 sm:min-w-[200px]"
              >
                Practice Again
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl border border-zinc-700 px-8 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-[#FF6B2B]/50 hover:bg-zinc-800 sm:min-w-[200px]"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-zinc-800 text-white px-5 py-3 rounded-xl shadow-2xl border border-zinc-700 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
