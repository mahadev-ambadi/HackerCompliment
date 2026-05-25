import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

const dashboardCards = [
  {
    title: "Start Mock Interview",
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
    title: "My Progress",
    description: "Track your interview readiness over time.",
    primary: false,
    href: "#",
    label: "Open",
  },
  {
    title: "Interview History",
    description: "Review past sessions and feedback reports.",
    primary: false,
    href: "#",
    label: "Open",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-full bg-[#09090b]">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-[#00C853]">Hacker</span>
            <span className="text-white">Compliment</span>
          </Link>
          <LogoutButton />
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
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#00C853]/30 bg-[#00C853]/10 px-4 py-2 text-sm font-medium text-[#00C853]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C853] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C853]" />
            </span>
            3 free sessions this week
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {dashboardCards.map((card) => (
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
                    ? "bg-[#00C853] text-black hover:bg-[#00b34a]"
                    : "border border-zinc-700 text-white hover:border-[#00C853]/50 hover:bg-zinc-800"
                }`}
              >
                {card.label}
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
