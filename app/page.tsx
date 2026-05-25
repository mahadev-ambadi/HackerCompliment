const companies = [
  "TCS",
  "Wipro",
  "Infosys",
  "Amazon",
  "Google",
  "Deloitte",
  "Accenture",
  "Cognizant",
];

const features = [
  {
    title: "AI Mock Interviews",
    description:
      "Face adaptive questions that mirror real hiring rounds — technical, HR, and aptitude — tuned to your target company and role.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
  {
    title: "Resume ATS Analyzer",
    description:
      "Upload your resume and get an ATS compatibility score plus actionable suggestions to pass recruiter screening.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: "Voice Confidence Analysis",
    description:
      "Get communication feedback on clarity, pace, filler words, and confidence — the kind of insight no human interviewer shares.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    ),
  },
];

const steps = [
  {
    step: "01",
    title: "Choose company + role",
    description:
      "Pick from TCS, Wipro, Infosys, Amazon, Google and more. Select your role — SDE, analyst, consultant, or fresher track.",
  },
  {
    step: "02",
    title: "AI conducts your interview",
    description:
      "Our AI asks adaptive questions based on real interview patterns — technical rounds, HR, and aptitude where relevant.",
  },
  {
    step: "03",
    title: "Get detailed feedback report",
    description:
      "Receive a breakdown of strengths, gaps, sample answers, and a readiness score you can improve session by session.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect to get started and build interview habit.",
    features: ["3 mock sessions per week", "Basic feedback report", "Company pattern previews"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pay per use",
    price: "₹99",
    period: "one-time",
    description: "Need a few more sessions before placement season?",
    features: ["3 extra mock sessions", "Full feedback report", "Resume ATS scan (1x)"],
    cta: "Buy Sessions",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₹599",
    period: "/month",
    description: "Unlimited practice for serious placement prep.",
    features: [
      "Unlimited mock interviews",
      "Voice confidence analysis",
      "Unlimited resume ATS scans",
      "Priority company patterns",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#" className="text-lg font-bold tracking-tight">
            <span className="text-[#00C853]">Hacker</span>
            <span className="text-white">Compliment</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-zinc-400 transition-colors hover:text-white">
              How it Works
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Pricing
            </a>
          </div>
          <a
            href="#pricing"
            className="rounded-lg bg-[#00C853] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#00b34a]"
          >
            Get Started Free
          </a>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-24 pt-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#00C853]/10 blur-[120px]" />
            <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-[#00C853]/5 blur-[80px]" />
          </div>
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#00C853]/30 bg-[#00C853]/10 px-4 py-1.5 text-sm font-medium text-[#00C853]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C853] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C853]" />
              </span>
              3 free sessions per week
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
              Crack Your Dream Job Interview{" "}
              <span className="text-[#00C853]">with AI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Practice with real company patterns — TCS, Wipro, Infosys, Amazon, Google. Get
              feedback no human interviewer will ever give you.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#pricing"
                className="w-full rounded-xl bg-[#00C853] px-8 py-3.5 text-base font-semibold text-black transition-colors hover:bg-[#00b34a] sm:w-auto"
              >
                Start Free Practice
              </a>
              <a
                href="#how-it-works"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-800/50 sm:w-auto"
              >
                Watch Demo
              </a>
            </div>
          </div>
        </section>

        {/* Companies */}
        <section className="border-y border-zinc-800/60 bg-zinc-950/50 px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-zinc-500">
              Practice for interviews at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {companies.map((name) => (
                <span
                  key={name}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#00C853]/40 hover:text-white"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Everything you need to{" "}
                <span className="text-[#00C853]">ace your interview</span>
              </h2>
              <p className="mt-4 text-zinc-400">
                Built for Indian students and freshers targeting campus placements and off-campus
                drives.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 transition-colors hover:border-[#00C853]/30 hover:bg-zinc-900/70"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-[#00C853]/15 p-3 text-[#00C853] transition-colors group-hover:bg-[#00C853]/25">
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="leading-relaxed text-zinc-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="bg-zinc-950/80 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">How it works</h2>
              <p className="mt-4 text-zinc-400">From signup to interview-ready in three simple steps.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((item, index) => (
                <div key={item.step} className="relative">
                  {index < steps.length - 1 && (
                    <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-[#00C853]/50 to-transparent md:block" />
                  )}
                  <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-8">
                    <span className="text-4xl font-bold text-[#00C853]/80">{item.step}</span>
                    <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 leading-relaxed text-zinc-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Simple, student-friendly pricing
              </h2>
              <p className="mt-4 text-zinc-400">Start free. Upgrade only when you need more.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlighted
                      ? "border-[#00C853] bg-zinc-900/80 shadow-[0_0_40px_-10px_rgba(0,200,83,0.3)]"
                      : "border-zinc-800 bg-zinc-900/40"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00C853] px-3 py-0.5 text-xs font-bold text-black">
                      MOST POPULAR
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-zinc-500">{plan.period}</span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#00C853]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#"
                    className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-[#00C853] text-black hover:bg-[#00b34a]"
                        : "border border-zinc-700 text-white hover:border-[#00C853]/50 hover:bg-zinc-800"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-zinc-500">
          © HackerCompliment 2026. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
