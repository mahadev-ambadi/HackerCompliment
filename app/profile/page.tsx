"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User Data
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    college: "",
    targetCompany: "",
    createdAt: "",
  });

  // Stats
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    bestScore: 0,
    sessionsThisWeek: 0,
  });

  const [recentInterviews, setRecentInterviews] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [plan, setPlan] = useState("Free");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
      
      setProfile({
        name: user.user_metadata?.full_name || "",
        email: user.email || "",
        college: user.user_metadata?.college || "",
        targetCompany: user.user_metadata?.target_company || "",
        createdAt: user.created_at,
      });

      // Fetch Interviews
      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      let avg = 0;
      let max = 0;
      let recent = [];
      
      if (sessions && sessions.length > 0) {
        recent = sessions.slice(0, 5);
        const scores = sessions.map((s: any) => s.overall_score || 0);
        max = Math.max(...scores);
        avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
      }
      setRecentInterviews(recent);

      // Fetch Session Usage
      const { data: usage } = await supabase
        .from("session_usage")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch Purchases
      const { data: purchaseData } = await supabase
        .from("purchases")
        .select("*")
        .order("created_at", { ascending: false });

      if (purchaseData && purchaseData.length > 0) {
        setPurchases(purchaseData);
        setPlan(purchaseData[0].plan || "Pro");
      }

      setStats({
        totalInterviews: sessions ? sessions.length : 0,
        averageScore: avg,
        bestScore: max,
        sessionsThisWeek: usage?.sessions_used || 0,
      });

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    await supabase.auth.updateUser({
      data: {
        full_name: profile.name,
        college: profile.college,
        target_company: profile.targetCompany,
      }
    });
    
    setSaving(false);
    alert("Profile updated successfully!");
  };

  const handlePasswordReset = async () => {
    if (profile.email) {
      await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/profile/update-password`,
      });
      alert("Password reset email sent!");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-[#FF6B2B]"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* 1. TOP PROFILE CARD */}
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 md:flex-row md:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B] text-3xl font-bold text-white shadow-lg">
            {getInitials(profile.name)}
          </div>
          
          <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
            <h1 className="text-3xl font-bold text-white">{profile.name || "Student"}</h1>
            <p className="mt-1 text-sm text-zinc-400">{profile.email}</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-medium text-zinc-500">
                Member since {formatDate(profile.createdAt)}
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-700"></span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                plan === "Free" ? "bg-zinc-800 text-zinc-400" : "bg-[#FF6B2B]/20 text-[#FF6B2B]"
              }`}>
                {plan} Plan
              </span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            <a href="#settings" className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#FF6B2B]/50 hover:bg-zinc-800">
              Edit Profile
            </a>
          </div>
        </div>

        {/* 2. STATS ROW */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm font-medium text-zinc-400">Total Interviews</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalInterviews}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm font-medium text-zinc-400">Average Score</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.averageScore}<span className="text-lg text-zinc-500">/100</span></p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm font-medium text-zinc-400">Best Score</p>
            <p className="mt-2 text-3xl font-bold text-[#FF6B2B]">{stats.bestScore}<span className="text-lg text-zinc-500">/100</span></p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm font-medium text-zinc-400">Sessions This Week</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.sessionsThisWeek}</p>
          </div>
        </div>

        {/* 3. BADGES SECTION */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="mb-6 text-xl font-bold text-white">🏆 Achievements</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {/* First Interview */}
            <div className={`flex flex-col items-center rounded-xl border p-4 text-center transition-colors ${
              stats.totalInterviews >= 1 ? "border-[#FF6B2B]/30 bg-[#FF6B2B]/5" : "border-zinc-800 bg-zinc-900/50 grayscale opacity-50"
            }`}>
              <span className="text-3xl mb-2">🎯</span>
              <p className="text-sm font-bold text-white">First Interview</p>
              {stats.totalInterviews < 1 && <span className="mt-2 text-xs text-zinc-500">🔒 Locked</span>}
            </div>
            
            {/* Practice Pro */}
            <div className={`flex flex-col items-center rounded-xl border p-4 text-center transition-colors ${
              stats.totalInterviews >= 5 ? "border-[#FF6B2B]/30 bg-[#FF6B2B]/5" : "border-zinc-800 bg-zinc-900/50 grayscale opacity-50"
            }`}>
              <span className="text-3xl mb-2">💪</span>
              <p className="text-sm font-bold text-white">Practice Pro</p>
              {stats.totalInterviews < 5 && <span className="mt-2 text-xs text-zinc-500">🔒 5 interviews</span>}
            </div>
            
            {/* High Scorer */}
            <div className={`flex flex-col items-center rounded-xl border p-4 text-center transition-colors ${
              stats.bestScore >= 80 ? "border-[#FF6B2B]/30 bg-[#FF6B2B]/5" : "border-zinc-800 bg-zinc-900/50 grayscale opacity-50"
            }`}>
              <span className="text-3xl mb-2">⭐</span>
              <p className="text-sm font-bold text-white">High Scorer</p>
              {stats.bestScore < 80 && <span className="mt-2 text-xs text-zinc-500">🔒 Score 80+</span>}
            </div>
            
            {/* Resume Master */}
            <div className="flex flex-col items-center rounded-xl border border-[#FF6B2B]/30 bg-[#FF6B2B]/5 p-4 text-center">
              <span className="text-3xl mb-2">📄</span>
              <p className="text-sm font-bold text-white">Resume Master</p>
            </div>
            
            {/* Early Adopter */}
            <div className="flex flex-col items-center rounded-xl border border-[#FF6B2B]/30 bg-[#FF6B2B]/5 p-4 text-center">
              <span className="text-3xl mb-2">🚀</span>
              <p className="text-sm font-bold text-white">Early Adopter</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* 4. RECENT INTERVIEWS */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recent Interviews</h2>
              <Link href="/history" className="text-sm font-medium text-[#FF6B2B] hover:underline">
                View All →
              </Link>
            </div>
            
            {recentInterviews.length > 0 ? (
              <div className="space-y-4">
                {recentInterviews.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <div>
                      <p className="font-bold text-white">{session.company || "General"} - {session.role || "SDE"}</p>
                      <p className="text-xs text-zinc-500">{new Date(session.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        session.overall_score >= 80 ? "text-[#FF6B2B]" : "text-zinc-300"
                      }`}>
                        {session.overall_score}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-zinc-500">No interviews completed yet.</p>
            )}
          </div>

          {/* 5. PURCHASE HISTORY */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="mb-6 text-xl font-bold text-white">Purchase History</h2>
            
            {purchases.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Plan</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {purchases.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-4">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-4 font-medium text-white">{p.plan}</td>
                        <td className="py-4">Rs.{p.amount}</td>
                        <td className="py-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            p.status === "completed" || p.status === "Completed" 
                              ? "bg-orange-500/10 text-orange-400" 
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500 mb-4">No purchases yet.</p>
                <Link href="/pricing" className="text-sm font-bold text-[#FF6B2B] hover:underline">
                  Upgrade for more sessions →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 6. SETTINGS SECTION */}
        <div id="settings" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="mb-6 text-xl font-bold text-white">⚙️ Account Settings</h2>
          
          <form onSubmit={handleSaveProfile} className="max-w-2xl space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Display Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Email Address (Read Only)</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">College / University</label>
                <input
                  type="text"
                  value={profile.college}
                  onChange={(e) => setProfile({...profile, college: e.target.value})}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Target Company</label>
                <input
                  type="text"
                  value={profile.targetCompany}
                  onChange={(e) => setProfile({...profile, targetCompany: e.target.value})}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#FF6B2B] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#ff5500] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Change Password
                </button>
              </div>
              
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl bg-red-500/10 px-6 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/20"
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>
        
      </div>
    </div>
  );
}
