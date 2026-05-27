"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

export type InterviewSession = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  interview_type: string;
  experience_level: string;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  confidence_score: number;
  strengths: string[];
  improvements: string[];
  detailed_feedback: string | null;
  would_recommend: boolean;
  duration_seconds: number;
  created_at: string;
};

type SortOption = "newest" | "highest" | "lowest";

function getScoreColor(score: number) {
  if (score < 50) return "text-red-400";
  if (score < 70) return "text-yellow-400";
  return "text-[#FF6B2B]";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds: number) {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min${mins !== 1 ? "s" : ""}`;
}

const selectClass =
  "rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B2B]/50";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Please log in to view your interview history.");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/history?user_id=${user.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load history.");
        }

        setSessions(data.sessions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const companies = useMemo(
    () => ["All Companies", ...new Set(sessions.map((s) => s.company))],
    [sessions]
  );
  const roles = useMemo(
    () => ["All Roles", ...new Set(sessions.map((s) => s.role))],
    [sessions]
  );
  const types = useMemo(
    () => ["All Types", ...new Set(sessions.map((s) => s.interview_type))],
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    let list = [...sessions];

    if (companyFilter !== "All Companies") {
      list = list.filter((s) => s.company === companyFilter);
    }
    if (roleFilter !== "All Roles") {
      list = list.filter((s) => s.role === roleFilter);
    }
    if (typeFilter !== "All Types") {
      list = list.filter((s) => s.interview_type === typeFilter);
    }

    if (sortBy === "highest") {
      list.sort((a, b) => b.overall_score - a.overall_score);
    } else if (sortBy === "lowest") {
      list.sort((a, b) => a.overall_score - b.overall_score);
    } else {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [sessions, companyFilter, roleFilter, typeFilter, sortBy]);

  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return { total: 0, average: 0, best: 0, companies: 0 };
    }
    const scores = sessions.map((s) => s.overall_score);
    return {
      total: sessions.length,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
      companies: new Set(sessions.map((s) => s.company)).size,
    };
  }, [sessions]);

  const recentTrend = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-5)
      .map((s) => s.overall_score);
  }, [sessions]);

  return (
    <div className="min-h-full bg-[#09090b]">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="text-zinc-400 transition-colors hover:text-white"
            aria-label="Back to dashboard"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Interview History</h1>
            <p className="text-xs text-zinc-500">Track your progress over time</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF6B2B]/30 border-t-[#FF6B2B]" />
            <p className="mt-4 text-sm text-zinc-400">Loading your interview history...</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
            <Link href="/login" className="ml-2 underline">
              Log in
            </Link>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
            <span className="text-5xl">📋</span>
            <h2 className="mt-4 text-xl font-semibold text-white">No interviews yet</h2>
            <p className="mt-2 text-zinc-400">Start your first mock interview</p>
            <Link
              href="/interview"
              className="mt-6 rounded-xl bg-[#FF6B2B] px-8 py-3 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110"
            >
              Start Interview
            </Link>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Total Interviews", value: stats.total },
                { label: "Average Score", value: stats.average },
                { label: "Best Score", value: stats.best },
                { label: "Companies Practiced", value: stats.companies },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
                >
                  <p className="text-xs text-zinc-500 sm:text-sm">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {recentTrend.length > 0 && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-sm font-medium text-zinc-400">Your recent scores</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {recentTrend.map((score, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <span
                        className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
                          score < 50
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : score < 70
                              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                              : "border-[#FF6B2B]/30 bg-[#FF6B2B]/10 text-[#FF6B2B]"
                        }`}
                      >
                        {score}
                      </span>
                      {i < recentTrend.length - 1 && (
                        <span className="text-zinc-600">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className={selectClass}
              >
                {companies.map((c) => (
                  <option key={c} value={c} className="bg-zinc-900">
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={selectClass}
              >
                {roles.map((r) => (
                  <option key={r} value={r} className="bg-zinc-900">
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={selectClass}
              >
                {types.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={selectClass}
              >
                <option value="newest" className="bg-zinc-900">
                  Newest First
                </option>
                <option value="highest" className="bg-zinc-900">
                  Highest Score
                </option>
                <option value="lowest" className="bg-zinc-900">
                  Lowest Score
                </option>
              </select>
            </div>

            <div className="mt-6 space-y-4">
              {filteredSessions.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">
                  No interviews match your filters.
                </p>
              ) : (
                filteredSessions.map((session) => {
                  const isExpanded = expandedId === session.id;
                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {session.company} · {session.role}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            {session.interview_type} · {session.experience_level}
                          </p>
                          <p className="mt-2 text-xs text-zinc-600">
                            {formatDate(session.created_at)} · {formatDuration(session.duration_seconds)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-4xl font-bold ${getScoreColor(session.overall_score)}`}
                          >
                            {session.overall_score}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              session.would_recommend
                                ? "border-[#FF6B2B]/30 bg-[#FF6B2B]/10 text-[#FF6B2B]"
                                : "border-red-500/30 bg-red-500/10 text-red-400"
                            }`}
                          >
                            {session.would_recommend ? "Recommend: Yes" : "Recommend: No"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          { label: "Technical", value: session.technical_score },
                          { label: "Communication", value: session.communication_score },
                          { label: "Problem Solving", value: session.problem_solving_score },
                          { label: "Confidence", value: session.confidence_score },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-lg bg-zinc-800/50 px-3 py-2 text-center"
                          >
                            <p className="text-xs text-zinc-500">{item.label}</p>
                            <p className={`text-sm font-bold ${getScoreColor(item.value)}`}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : session.id)
                        }
                        className="mt-4 text-sm font-medium text-[#FF6B2B] hover:text-[#FF6B2B]"
                      >
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>

                      {isExpanded && (
                        <div className="mt-4 border-t border-zinc-800 pt-4">
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                              <h4 className="font-semibold text-[#FF6B2B]">Strengths</h4>
                              <ul className="mt-3 space-y-2">
                                {(session.strengths ?? []).map((item) => (
                                  <li
                                    key={item}
                                    className="flex gap-2 text-sm text-zinc-300"
                                  >
                                    <span className="text-[#FF6B2B]">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-semibold text-amber-400">Areas to Improve</h4>
                              <ul className="mt-3 space-y-2">
                                {(session.improvements ?? []).map((item) => (
                                  <li
                                    key={item}
                                    className="flex gap-2 text-sm text-zinc-300"
                                  >
                                    <span className="text-amber-400">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          {session.detailed_feedback && (
                            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                              {session.detailed_feedback}
                            </p>
                          )}
                          <Link
                            href="/interview"
                            className="mt-4 inline-block rounded-xl bg-[#FF6B2B] px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110"
                          >
                            Practice This Again
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
