"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/admin";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersThisWeek: 0,
    recentUsers: [] as any[],
    totalSessions: 0,
    sessionsThisWeek: 0,
    totalSubmissions: 0,
    totalRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    topCompanies: [] as { company: string, count: number }[],
    planBreakdown: {} as Record<string, number>,
    planDetails: {} as Record<string, any[]>
  });

  const [revenueFilter, setRevenueFilter] = useState<"all" | "weekly" | "monthly" | "yearly">("all");
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<{ plan: string, users: any[] } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isAdmin(session.user.id)) {
        router.push("/dashboard");
        return;
      }
      
      await fetchAllStats(session.access_token);
      setLoading(false);
      
      const interval = setInterval(() => {
        fetchAllStats(session.access_token);
      }, 60000);
      
      return () => clearInterval(interval);
    }
    
    checkAdminAndFetch();
  }, [router, supabase]);

  async function fetchAllStats(token: string) {
    try {
      const res = await fetch("/api/admin/analytics", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch user analytics");
      const apiData = await res.json();
      
      setStats({
        totalUsers: apiData.totalUsers || 0,
        newUsersThisWeek: apiData.newUsersThisWeek || 0,
        recentUsers: apiData.recentUsers || [],
        totalSessions: apiData.totalSessions || 0,
        sessionsThisWeek: apiData.sessionsThisWeek || 0,
        totalSubmissions: apiData.totalSubmissions || 0,
        totalRevenue: apiData.totalRevenue || 0,
        weeklyRevenue: apiData.weeklyRevenue || 0,
        monthlyRevenue: apiData.monthlyRevenue || 0,
        yearlyRevenue: apiData.yearlyRevenue || 0,
        topCompanies: apiData.topCompanies || [],
        planBreakdown: apiData.planBreakdown || {},
        planDetails: apiData.planDetails || {}
      });
      
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF6B2B]/30 border-t-[#FF6B2B]"></span>
      </div>
    );
  }

  const maxCompanyCount = stats.topCompanies.length > 0 ? stats.topCompanies[0].count : 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#FF6B2B]/30">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-white">Analytics Dashboard</h1>
            <span className="rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 px-3 py-1 text-xs font-semibold text-[#FF6B2B]">
              Admin Only
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={() => router.back()}
              className="rounded-xl bg-zinc-800 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-zinc-700"
            >
              &larr; Back
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm mb-6">
            Error: {error}
          </div>
        )}

        {/* Top Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-sm font-medium text-zinc-400">Total Users</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-xs font-medium text-emerald-400">+{stats.newUsersThisWeek} this week</p>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-sm font-medium text-zinc-400">Total Sessions</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
              <p className="text-xs font-medium text-emerald-400">+{stats.sessionsThisWeek} this week</p>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-sm font-medium text-zinc-400">Code Submissions</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalSubmissions}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-zinc-400">Revenue</p>
              <select 
                value={revenueFilter}
                onChange={(e) => setRevenueFilter(e.target.value as any)}
                className="bg-zinc-800 border border-zinc-700 text-xs rounded-md px-2 py-1 text-zinc-300 outline-none focus:border-[#FF6B2B]/50 transition-colors cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="yearly">Last 365 Days</option>
                <option value="monthly">Last 30 Days</option>
                <option value="weekly">Last 7 Days</option>
              </select>
            </div>
            <p className="text-3xl font-bold text-[#FF6B2B]">
              ₹{
                revenueFilter === "all" ? stats.totalRevenue.toLocaleString() :
                revenueFilter === "yearly" ? stats.yearlyRevenue.toLocaleString() :
                revenueFilter === "monthly" ? stats.monthlyRevenue.toLocaleString() :
                stats.weeklyRevenue.toLocaleString()
              }
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Companies Bar Chart */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-bold text-white mb-6">Top 5 Companies Practiced</h2>
            <div className="space-y-4">
              {stats.topCompanies.map((c) => (
                <div key={c.company}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-zinc-300">{c.company}</span>
                    <span className="text-zinc-500">{c.count} sessions</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-[#FF6B2B] transition-all duration-1000" 
                      style={{ width: `${(c.count / maxCompanyCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Breakdown & Recent Users */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Paid Plan Breakdown</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                  <button 
                    key={plan} 
                    onClick={() => setSelectedPlanDetails({ plan, users: stats.planDetails[plan] || [] })}
                    className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 border border-zinc-700 hover:border-[#FF6B2B]/50 hover:bg-zinc-800/80 transition-all cursor-pointer"
                  >
                    <span className="text-sm font-bold text-white capitalize">{plan}</span>
                    <span className="rounded-full bg-[#FF6B2B]/20 px-2 py-0.5 text-xs font-bold text-[#FF6B2B]">{count}</span>
                  </button>
                ))}
                {Object.keys(stats.planBreakdown).length === 0 && (
                  <p className="text-sm text-zinc-500">No completed purchases yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Recent Signups</h2>
              <div className="space-y-3">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
                    <div className="truncate">
                      <p className="text-sm font-medium text-white truncate">{u.display_name}</p>
                      <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Plan Details Modal */}
      {selectedPlanDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white capitalize">{selectedPlanDetails.plan} Plan Purchases</h2>
              <button 
                onClick={() => setSelectedPlanDetails(null)}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              {selectedPlanDetails.users.length === 0 ? (
                <p className="text-zinc-500 text-sm">No details available.</p>
              ) : (
                selectedPlanDetails.users.map((u, idx) => (
                  <div key={idx} className="flex flex-col gap-1 rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{u.name}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(u.date).toLocaleDateString()} at {new Date(u.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-400">{u.email}</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedPlanDetails(null)}
                className="rounded-xl bg-zinc-800 px-5 py-2 text-sm font-bold text-white hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
