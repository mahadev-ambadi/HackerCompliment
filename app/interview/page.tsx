"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EvaluationResult } from "@/app/api/evaluate/route";
import { createClient } from "@/lib/supabase";

type Step = "setup" | "interview" | "results";

const companies = [
  "TCS",
  "Wipro",
  "Infosys",
  "Accenture",
  "Cognizant",
  "Amazon",
  "Google",
  "Microsoft",
  "Deloitte",
  "Other",
];

const roles = [
  "Software Engineer",
  "Data Analyst",
  "Business Analyst",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "DevOps Engineer",
  "Other",
];

const interviewTypes = ["HR Round", "Technical Round", "Behavioral Round"] as const;
const experienceLevels = ["Fresher", "1-3 Years", "3+ Years"] as const;

type InterviewType = (typeof interviewTypes)[number];
type ExperienceLevel = (typeof experienceLevels)[number];

const TOTAL_QUESTIONS = 5;
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
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            selected === option
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
  const [role, setRole] = useState(roles[0]);
  const [interviewType, setInterviewType] = useState<InterviewType>("Technical Round");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("Fresher");

  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
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

  const questions = useMemo(() => mockQuestions[interviewType], [interviewType]);
  const currentQuestion = questions[questionIndex];
  const answeredCount = evaluations.length;
  const displayProgress =
    step === "interview"
      ? ((questionIndex + (evaluating ? 0 : 0)) / TOTAL_QUESTIONS) * 100
      : 100;

  const sessionLimitReached = sessionInfo ? !sessionInfo.canStart : false;

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
        const res = await fetch("/api/session-limit", {
          credentials: "include",
          headers: authHeaders,
        });
        const data = await res.json();
        if (isMounted) {
          setSessionInfo(data);
          setSessionsUsed(data.sessions_used ?? 0);
          setCheckingLimit(false);
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
      const res = await fetch("/api/session-limit", {
        credentials: "include",
        headers: authHeaders,
      });
      const data = await res.json();
      console.log("GET /api/session-limit response:", res.status, data);

      if (res.ok) {
        setSessionsUsed(data.sessions_used ?? 0);
        setSessionInfo(data);
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

  async function incrementSessionUsage() {
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
      const data = await res.json();
      console.log("POST /api/session-limit response:", res.status, data);

      if (!res.ok) {
        console.error("Session increment failed:", data);
        return;
      }

      setSessionsUsed(data.sessions_used ?? 0);
      await fetchSessionUsage();
    } catch (err) {
      console.error("Failed to increment session usage:", err);
    }
  }

  async function completeInterview(evals: EvaluationResult[]) {
    const agg = aggregateEvaluations(evals);
    setResults(agg);
    setStep("results");

    await saveSessionToDatabase(agg);
    await incrementSessionUsage();
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

    setEvalError("Answer at least one question before ending the interview.");
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

  function handleStartInterview() {
    if (sessionLimitReached) return;

    setQuestionIndex(0);
    setAnswer("");
    setElapsedSeconds(0);
    setEvaluations([]);
    setResults(null);
    setEvalError(null);
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
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            <span className="text-[#FF6B2B]">Hacker</span>
            <span className="text-white">Compliment</span>
          </Link>
          {step !== "setup" && (
            <span className="text-xs text-zinc-500 sm:text-sm">AI Interview Simulator</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {step === "setup" && (
          <div className="mx-auto max-w-xl transition-opacity duration-300">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Configure Your Interview
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Set up your mock interview — 5 questions with real AI evaluation.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-4 py-1.5 text-sm font-medium text-[#FF6B2B]">
                {sessionsLoading ? (
                  "Loading session usage..."
                ) : (
                  <>
                    {sessionsUsed} of {FREE_SESSION_LIMIT} free sessions used this week
                  </>
                )}
              </div>

              {sessionLimitReached && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  Session limit reached. Upgrade to Pro
                </p>
              )}

              <div className="mt-8 space-y-6">
                <div>
                  <label htmlFor="company" className="mb-2 block text-sm font-medium text-zinc-300">
                    Company
                  </label>
                  <select
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={selectClass}
                  >
                    {companies.map((c) => (
                      <option key={c} value={c} className="bg-zinc-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="role" className="mb-2 block text-sm font-medium text-zinc-300">
                    Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={selectClass}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r} className="bg-zinc-900">
                        {r}
                      </option>
                    ))}
                  </select>
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

                {checkingLimit ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-[#FF6B2B] py-4 text-base font-semibold text-black transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Checking availability...
                  </button>
                ) : sessionInfo?.canStart === false ? (
                  <div className="rounded-xl border border-red-500/30 bg-zinc-900 p-5 text-center">
                    <div className="mb-2 text-2xl">🚫</div>
                    <h3 className="mb-2 font-bold text-white">Weekly Limit Reached</h3>
                    <p className="mb-4 text-sm text-zinc-300">
                      You've used all 3 free sessions this week. Resets every Monday.
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-block rounded-lg bg-[#FF6B2B] px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110"
                    >
                      Upgrade Now
                    </Link>
                    <p className="mt-3 text-xs text-zinc-500">
                      Or wait until Monday for your free sessions to reset.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartInterview}
                    disabled={sessionLimitReached || sessionsLoading}
                    className="w-full rounded-xl bg-[#FF6B2B] py-4 text-base font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Start Interview
                  </button>
                )}
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
                className={`mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  results.wouldRecommend
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
    </div>
  );
}
