"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { ResumeAnalysisResult } from "@/app/api/analyze-resume/route";

type Step = "upload" | "results";

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
  "Any Company",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getScoreColor(score: number) {
  if (score < 50) return "text-red-400";
  if (score < 70) return "text-yellow-400";
  return "text-[#00C853]";
}

function getScoreStroke(score: number) {
  if (score < 50) return "stroke-red-400";
  if (score < 70) return "stroke-yellow-400";
  return "stroke-[#00C853]";
}

function getVerdictLabel(score: number) {
  if (score < 50) return "Needs Major Improvement";
  if (score < 70) return "Average - Can Be Better";
  if (score < 85) return "Good - Minor Tweaks Needed";
  return "Excellent - Ready to Apply";
}

function CircularScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="8"
          className="stroke-zinc-800"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-700 ${getScoreStroke(score)}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-sm text-zinc-500">/100</span>
      </div>
    </div>
  );
}

const selectClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#00C853]/50 focus:ring-1 focus:ring-[#00C853]/30 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10";

export default function ResumePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState(roles[0]);
  const [targetCompany, setTargetCompany] = useState(companies[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysisResult | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [fixData, setFixData] = useState<any>(null);
  const [fixing, setFixing] = useState(false);

  const validateAndSetFile = useCallback((selected: File | null) => {
    if (!selected) return;

    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please upload a PDF file.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("File size exceeds 5MB limit.");
      return;
    }

    setFile(selected);
    setError(null);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files[0] ?? null);
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Please upload your resume PDF first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const extractForm = new FormData();
      extractForm.append("resume", file);

      const extractRes = await fetch("/api/extract-pdf", {
        method: "POST",
        body: extractForm,
      });
      const extractData = await extractRes.json();

      if (!extractRes.ok) {
        throw new Error(extractData.error || "Failed to extract PDF text.");
      }

      setResumeText(extractData.text);

      const analyzeRes = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: extractData.text,
          targetRole,
          targetCompany,
        }),
      });
      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        if (analyzeRes.status === 400 && analyzeData.error === "Invalid document") {
          throw new Error("⚠️ Please upload a valid resume. The file you uploaded doesn't look like a resume.");
        }
        throw new Error(analyzeData.error || "Resume analysis failed.");
      }

      setAnalysis(analyzeData as ResumeAnalysisResult);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyzeAnother() {
    setStep("upload");
    setFile(null);
    setAnalysis(null);
    setResumeText(null);
    setFixData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  async function handleFixResume() {
    if (!resumeText || !analysis) return;
    
    setFixing(true);
    try {
      const res = await fetch("/api/fix-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          role: targetRole,
          company: targetCompany,
          issues: analysis.issuesFound,
          improvements: analysis.suggestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fix resume.");
      
      setFixData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fix resume. Please try again.");
    } finally {
      setFixing(false);
    }
  }

  return (
    <div className="min-h-full bg-[#09090b]">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            <span className="text-[#00C853]">Hacker</span>
            <span className="text-white">Compliment</span>
          </Link>
          <span className="text-xs text-zinc-500 sm:text-sm">Resume Analyzer</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {step === "upload" && (
          <div className="transition-opacity duration-300">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">AI Resume Analyzer</h1>
              <p className="mt-2 text-zinc-400">
                Find out if your resume will pass ATS screening
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
              {error && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 transition-colors ${
                  isDragging
                    ? "border-[#00C853] bg-[#00C853]/5"
                    : "border-zinc-700 bg-zinc-800/30"
                }`}
              >
                <span className="text-5xl">📄</span>
                <p className="mt-4 text-lg font-semibold text-white">Drop your resume here</p>
                <p className="mt-1 text-sm text-zinc-500">Supports PDF files up to 5MB</p>
                {file && (
                  <p className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-[#00C853]">
                    {file.name}
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="mt-6 rounded-xl bg-[#00C853] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00b34a] disabled:opacity-60"
                >
                  Click to browse
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="targetRole" className="mb-2 block text-sm font-medium text-zinc-300">
                    Target Role
                  </label>
                  <select
                    id="targetRole"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    disabled={loading}
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
                  <label
                    htmlFor="targetCompany"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Target Company
                  </label>
                  <select
                    id="targetCompany"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    disabled={loading}
                    className={selectClass}
                  >
                    {companies.map((c) => (
                      <option key={c} value={c} className="bg-zinc-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !file}
                className="mt-6 w-full rounded-xl bg-[#00C853] py-4 text-base font-semibold text-black transition-colors hover:bg-[#00b34a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    AI is reading your resume...
                  </span>
                ) : (
                  "Analyze My Resume"
                )}
              </button>
            </div>
          </div>
        )}

        {step === "results" && analysis && (
          <div className="transition-opacity duration-300">
            {/* ATS Score Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
              <CircularScore score={analysis.atsScore} />
              <h2 className="mt-6 text-xl font-semibold text-white">ATS Compatibility Score</h2>
              <p className={`mt-2 text-lg font-medium ${getScoreColor(analysis.atsScore)}`}>
                {getVerdictLabel(analysis.atsScore)}
              </p>
              {analysis.verdict && (
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
                  {analysis.verdict}
                </p>
              )}
              <p className="mt-2 text-xs text-zinc-500">
                {targetRole} · {targetCompany}
              </p>
            </div>

            {/* 4 Score Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Keywords Match", value: analysis.keywordsScore },
                { label: "Formatting", value: analysis.formattingScore },
                { label: "Readability", value: analysis.readabilityScore },
                { label: "Relevance", value: analysis.relevanceScore },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center"
                >
                  <p className="text-xs text-zinc-500 sm:text-sm">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${getScoreColor(card.value)}`}>
                    {card.value}
                    <span className="text-sm font-normal text-zinc-500">/100</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Keywords */}
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="text-lg font-semibold text-white">Keywords Analysis</h3>
              <div className="mt-4">
                <p className="text-sm font-medium text-[#00C853]">Keywords Found</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.keywordsFound.length > 0 ? (
                    analysis.keywordsFound.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-lg border border-[#00C853]/30 bg-[#00C853]/10 px-3 py-1 text-xs font-medium text-[#00C853]"
                      >
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-500">No matching keywords detected</span>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-red-400">Missing Keywords</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.missingKeywords.length > 0 ? (
                    analysis.missingKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400"
                      >
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-500">No critical gaps identified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Issues */}
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="text-lg font-semibold text-white">Issues Found</h3>
              <ul className="mt-4 space-y-3">
                {analysis.issuesFound.length > 0 ? (
                  analysis.issuesFound.map((issue) => (
                    <li key={issue} className="flex gap-2 text-sm text-red-400">
                      <span>⚠️</span>
                      <span>{issue}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-zinc-500">No major issues detected</li>
                )}
              </ul>
            </div>

            {/* Suggestions */}
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="text-lg font-semibold text-white">Improvement Suggestions</h3>
              <ol className="mt-4 space-y-3">
                {analysis.suggestions.map((suggestion, i) => (
                  <li key={suggestion} className="flex gap-3 text-sm text-zinc-300">
                    <span className="shrink-0 text-[#00C853]">✅</span>
                    <span>
                      <span className="font-medium text-white">{i + 1}. </span>
                      {suggestion}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Fix Resume Button */}
            <div className="mt-8 flex flex-col items-center">
              {!fixData && !fixing && (
                <button
                  type="button"
                  onClick={handleFixResume}
                  className="rounded-xl bg-[#00C853] px-8 py-3 text-base font-bold text-black transition-colors hover:bg-[#00b34a] shadow-lg shadow-[#00C853]/20"
                >
                  ✨ Fix My Resume with AI
                </button>
              )}
              {fixing && (
                <p className="text-center font-medium text-[#00C853]">
                  🔄 AI is rewriting your resume...
                </p>
              )}
            </div>

            {/* Fix Data Results */}
            {fixData && (
              <div className="mt-8 space-y-6">
                {/* Section A — Professional Summary */}
                <div className="relative rounded-2xl border border-zinc-800 border-l-4 border-l-[#00C853] bg-zinc-900/40 p-6">
                  <h3 className="text-lg font-semibold text-white">✅ Rewritten Professional Summary</h3>
                  <p className="mt-3 leading-relaxed text-zinc-300">{fixData.professionalSummary}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(fixData.professionalSummary)}
                    className="absolute right-6 top-6 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                  >
                    Copy
                  </button>
                </div>

                {/* Section B — Before & After Bullets */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <h3 className="text-lg font-semibold text-white">📝 Rewritten Bullet Points</h3>
                  <div className="mt-6 space-y-6">
                    {fixData.beforeAfterBullets?.map((item: any, i: number) => (
                      <div key={i} className="space-y-3">
                        <h4 className="text-sm font-semibold text-[#00C853]">{item.section}</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                            <p className="mb-2 text-xs font-medium uppercase text-red-400">Before</p>
                            <p className="text-sm text-red-400 line-through opacity-80">{item.before}</p>
                          </div>
                          <div className="rounded-xl border border-[#00C853]/20 bg-[#00C853]/10 p-4">
                            <p className="mb-2 text-xs font-medium uppercase text-[#00C853]">After</p>
                            <p className="text-sm font-medium text-[#00C853]">{item.after}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section C — Skills To Add */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <h3 className="text-lg font-semibold text-white">🎯 Add These Skills to Your Resume</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {fixData.skillsToAdd?.map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-[#00C853]/30 bg-[#00C853]/10 px-3 py-1 text-sm font-medium text-[#00C853]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Section D — Quick Wins */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <h3 className="text-lg font-semibold text-white">⚡ Quick Wins</h3>
                  <ul className="mt-4 space-y-3">
                    {fixData.quickWins?.map((win: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm text-zinc-300">
                        <span className="shrink-0">✅</span>
                        <span>{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleAnalyzeAnother}
                className="rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-white transition-colors hover:border-[#00C853]/50 hover:bg-zinc-800 sm:min-w-[220px]"
              >
                Analyze Another Resume
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl bg-[#00C853] px-8 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-[#00b34a] sm:min-w-[220px]"
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
