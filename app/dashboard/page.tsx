import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileDropdown from "@/components/ProfileDropdown";
import SessionTracker from "@/components/SessionTracker";
import CodingPracticeCard from "@/components/CodingPracticeCard";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

const dashboardCards = [
  {
    title: "Technical Round",
    description: "Practice with AI using real company interview patterns.",
    primary: true,
    href: "/interview",
    label: "Start Now",
  },
  {
    title: "Analyze My Resume",
    description: "Get your ATS score and improvement suggestions.",
    primary: false,
    href: "/resume",
    label: "Open",
  },
  {
    title: "Coding Practice",
    description: "Practice real DSA problems from top companies",
    primary: false,
    href: "/practice",
    label: "Start Practicing",
  },
  {
    title: "Mock Interview",
    description: "Full-length comprehensive mock interview.",
    primary: false,
    href: "/mock-interview",
    label: "Start Now",
  }
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getScoreColor(score: number) {
  if (score < 50) return "text-red-400";
  if (score < 70) return "text-yellow-400";
  return "text-[#FF6B2B]";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("REDIRECTING TO LOGIN BECAUSE (DASHBOARD FETCH ERROR):", error);
  } else if (!data?.session?.user) {
    console.log("REDIRECTING TO LOGIN BECAUSE (NO USER DATA FOUND IN DASHBOARD)");
  }

  if (error || !data?.session?.user) {
    redirect("/login");
  }

  const user = data.session.user;
  const isAdminUser = isAdmin(user.id);

  const { data: recentSessions } = await supabase
    .from("interview_sessions")
    .select("id, company, role, overall_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const { data: purchaseData } = await supabase
    .from("purchases")
    .select("plan")
    .in("status", ["active", "completed", "Completed"])
    .order("created_at", { ascending: false })
    .limit(1);
    
  let plan = "Free";
  if (purchaseData && purchaseData.length > 0) {
    const rawPlan = purchaseData[0].plan;
    plan = rawPlan ? rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1) : "Free";
  }

  return (
    <div className="min-h-full bg-[#09090b]">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-[#FF6B2B]">Hacker</span>
            <span className="text-white">Compliment</span>
          </Link>
          <ProfileDropdown 
            name={displayName} 
            email={user.email || ""} 
            initials={initials} 
            plan={plan} 
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {displayName}!
            </h1>
            <p className="mt-2 text-zinc-400">
              Ready to practice for your dream company interview?
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-4 py-2 text-sm font-medium text-[#FF6B2B]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B2B] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF6B2B]" />
            </span>
            3 free sessions this week
          </span>
        </div>

        {recentSessions && recentSessions.length > 0 && (
          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Interviews</h2>
              <Link
                href="/history"
                className="text-sm font-medium text-[#FF6B2B] hover:text-[#FF6B2B]"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {recentSessions.map(
                (session: {
                  id: string;
                  company: string;
                  role: string;
                  overall_score: number;
                  created_at: string;
                }) => (
                  <Link
                    key={session.id}
                    href="/history"
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 transition-colors hover:border-[#FF6B2B]/30"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {session.company} · {session.role}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-xl font-bold ${getScoreColor(session.overall_score)}`}
                    >
                      {session.overall_score}
                    </span>
                  </Link>
                )
              )}
            </div>
          </div>
        )}

        <SessionTracker userId={user.id} />

        <div className="grid gap-6 sm:grid-cols-2">
          {dashboardCards.map((card) => {
            if (card.title === "Coding Practice") {
              return <CodingPracticeCard key={card.title} userId={user.id} />;
            }
            return (
              <div
                key={card.title}
                className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
              >
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                  {card.description}
                </p>
                <Link
                  href={card.href}
                  className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                    card.primary
                      ? "bg-[#FF6B2B] text-black transition-all duration-200 hover:scale-105 hover:brightness-110"
                      : "border border-zinc-700 text-white hover:border-[#FF6B2B]/50 hover:bg-zinc-800"
                  }`}
                >
                  {card.label}
                </Link>
              </div>
            );
          })}
        </div>

        {isAdminUser && (
          <div className="mt-8 rounded-2xl border border-[#FF6B2B]/30 bg-zinc-900/40 p-6 shadow-[0_0_15px_rgba(255,107,43,0.05)]">
            <div className="mb-6">
              <span className="inline-block mb-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
                Admin Area
              </span>
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/admin/review"
                className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50 py-4 text-sm font-semibold text-white transition-all hover:border-[#FF6B2B]/50 hover:bg-zinc-800"
              >
                Review Questions
              </Link>
              <Link
                href="/admin/problems"
                className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50 py-4 text-sm font-semibold text-white transition-all hover:border-[#FF6B2B]/50 hover:bg-zinc-800"
              >
                Review Problems
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center justify-center rounded-xl border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 py-4 text-sm font-semibold text-[#FF6B2B] transition-all hover:bg-[#FF6B2B]/20"
              >
                View Analytics
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
