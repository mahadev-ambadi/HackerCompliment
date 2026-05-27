"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* 1. NAVBAR */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-1 text-xl font-bold tracking-tight">
            <span className="text-white">Hacker</span>
            <span className="text-accent">Compliment</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="nl text-sm font-medium text-zinc-300 hover:text-white">Features</a>
            <a href="#how-it-works" className="nl text-sm font-medium text-zinc-300 hover:text-white">How It Works</a>
            <a href="#pricing" className="nl text-sm font-medium text-zinc-300 hover:text-white">Pricing</a>
            <a href="#companies" className="nl text-sm font-medium text-zinc-300 hover:text-white">Companies</a>
          </nav>

          <div className="hidden md:block">
            <Link href="/signup" className="shimmer inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-zinc-950 transition-transform hover:scale-105">
              Get Started Free
            </Link>
          </div>
          
          <button className="md:hidden text-zinc-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-6 md:hidden flex flex-col gap-4">
            <a href="#features" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#companies" className="text-lg font-medium text-zinc-300" onClick={() => setMobileMenuOpen(false)}>Companies</a>
            <Link href="/signup" className="mt-4 rounded-full bg-accent px-6 py-3 text-center font-bold text-zinc-950" onClick={() => setMobileMenuOpen(false)}>
              Get Started Free
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="relative flex min-h-screen items-center justify-center px-6 pt-20 overflow-hidden">
          <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-block rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent">
              🚀 AI-Powered Interview Prep
            </div>
            
            <h1 className="mb-6 font-['PT_Sans'] text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl">
              Crack Every Interview<br />
              <span className="text-accent">With AI by Your Side</span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-400">
              Practice with real company questions from TCS, Wipro, Infosys, Amazon and more. Get instant AI feedback tailored for students and freshers.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup" className="shimmer flex items-center justify-center rounded-full bg-accent px-8 py-4 text-base font-bold text-zinc-950 w-full sm:w-auto">
                Start Practicing Free →
              </Link>
              <a href="#how-it-works" className="flex items-center justify-center rounded-full border border-zinc-700 px-8 py-4 text-base font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white w-full sm:w-auto">
                See How It Works
              </a>
            </div>

            <div className="mt-14 border-t border-zinc-800/60 pt-8 flex flex-wrap justify-center gap-12 sm:gap-24">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white">50+</span>
                <span className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">Companies Covered</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white">3</span>
                <span className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">Free Sessions Weekly</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white">AI</span>
                <span className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">Powered Feedback</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. COMPANIES SECTION */}
        <section id="companies" className="py-16 px-6 relative z-10 border-y border-zinc-900 bg-zinc-950/50">
          <div className="mx-auto max-w-6xl text-center">
            <p className="mb-8 text-sm font-medium text-zinc-500">Trusted by students preparing for</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {['TCS', 'Wipro', 'Infosys', 'Amazon', 'Google', 'Deloitte', 'Accenture', 'Cognizant'].map(company => (
                <div key={company} className="rounded-full border border-zinc-800 bg-zinc-900/40 px-6 py-2 text-sm font-medium text-zinc-400">
                  {company}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. FEATURES SECTION */}
        <section id="features" className="py-24 px-6 bg-zinc-900/40">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">FEATURES</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">Everything you need to ace your interview</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
                <div className="mb-6 text-4xl">🎯</div>
                <h3 className="mb-3 text-xl font-bold text-white">AI Interview Simulator</h3>
                <p className="text-zinc-400 leading-relaxed">Practice with Alex AI across HR, Technical and Behavioral rounds for any company.</p>
              </div>
              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
                <div className="mb-6 text-4xl">📄</div>
                <h3 className="mb-3 text-xl font-bold text-white">Resume Analyzer</h3>
                <p className="text-zinc-400 leading-relaxed">Get ATS score, keyword analysis and AI-powered fix suggestions for your resume.</p>
              </div>
              <div className="card-h rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
                <div className="mb-6 text-4xl">📊</div>
                <h3 className="mb-3 text-xl font-bold text-white">JD Match Analyzer</h3>
                <p className="text-zinc-400 leading-relaxed">Upload any job description and see exactly how well your resume matches it.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HOW IT WORKS */}
        <section id="how-it-works" className="py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">HOW IT WORKS</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">3 simple steps to interview success</h2>
            </div>
            
            <div className="grid gap-12 md:grid-cols-3 relative">
              {/* Optional connector line on desktop */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
              
              <div className="relative text-center md:text-left z-10">
                <span className="block font-['PT_Sans'] text-7xl font-bold text-accent/20 mb-4">01</span>
                <h3 className="text-xl font-bold text-white mb-3">Choose Your Company & Role</h3>
                <p className="text-zinc-400 leading-relaxed">Select from over 50 top Indian and global companies and pick the exact role you're applying for.</p>
              </div>
              
              <div className="relative text-center md:text-left z-10">
                <span className="block font-['PT_Sans'] text-7xl font-bold text-accent/20 mb-4">02</span>
                <h3 className="text-xl font-bold text-white mb-3">Practice with AI Interviewer</h3>
                <p className="text-zinc-400 leading-relaxed">Answer dynamic, adaptive questions based on real interview patterns via text or voice.</p>
              </div>
              
              <div className="relative text-center md:text-left z-10">
                <span className="block font-['PT_Sans'] text-7xl font-bold text-accent/20 mb-4">03</span>
                <h3 className="text-xl font-bold text-white mb-3">Get Instant Feedback & Improve</h3>
                <p className="text-zinc-400 leading-relaxed">Receive a detailed breakdown of your performance, model answers, and areas to improve before the real day.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. PRICING SECTION */}
        <section id="pricing" className="py-24 px-6 bg-zinc-900/40">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">PRICING</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">Simple, transparent pricing</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Free</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.0</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ 3 sessions/week</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Basic resume scan</li>
                </ul>
                <Link href="/signup" className="w-full rounded-xl border border-zinc-700 py-3 text-center font-bold text-white transition-colors hover:bg-zinc-800">Get Started</Link>
              </div>
              
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Basic</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.99</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ 3 extra sessions</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ One-time purchase</li>
                </ul>
                <Link href="/pricing" className="w-full rounded-xl border border-zinc-700 py-3 text-center font-bold text-white transition-colors hover:bg-zinc-800">Upgrade</Link>
              </div>
              
              <div className="rounded-2xl border border-accent bg-zinc-900 p-6 flex flex-col relative shadow-[0_0_30px_rgba(255,107,43,0.1)]">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-950">Most Popular</span>
                <h3 className="text-lg font-bold text-white mb-2">Boost</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.299</span><span className="text-zinc-500 text-sm"> /7-days</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-white font-medium flex items-center gap-2">✓ 7-day unlimited access</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ JD Match Analysis</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Priority prep</li>
                </ul>
                <Link href="/pricing" className="w-full rounded-xl bg-accent py-3 text-center font-bold text-zinc-950 transition-colors hover:bg-[#e65a20]">Upgrade</Link>
              </div>
              
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Pro</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-white">Rs.599</span><span className="text-zinc-500 text-sm"> /month</span></div>
                <ul className="mb-8 space-y-3 flex-1">
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Unlimited everything</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ Voice analysis</li>
                  <li className="text-sm text-zinc-400 flex items-center gap-2">✓ 24/7 support</li>
                </ul>
                <Link href="/pricing" className="w-full rounded-xl border border-zinc-700 py-3 text-center font-bold text-white transition-colors hover:bg-zinc-800">Upgrade</Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. TESTIMONIALS */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">REVIEWS</span>
              <h2 className="mt-4 font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl">What students say</h2>
            </div>
            
            <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-12 text-center">
              <div className="mb-6 text-5xl">💬</div>
              <h3 className="mb-3 text-2xl font-bold text-white">Reviews coming soon</h3>
              <p className="mb-6 leading-relaxed text-zinc-400">
                We just launched! Be among the first to try HackerCompliment and share your experience after your interview practice.
              </p>
              <p className="text-sm font-semibold text-accent">
                Have feedback? Use the feedback button below →
              </p>
            </div>
          </div>
        </section>

        {/* 8. CTA SECTION */}
        <section className="py-24 px-6 relative z-10">
          <div className="mx-auto max-w-5xl rounded-3xl bg-zinc-900 px-6 py-20 text-center relative overflow-hidden">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="font-['PT_Sans'] text-4xl font-bold text-white md:text-5xl mb-4">Ready to crack your dream company interview?</h2>
              <p className="mb-10 text-lg text-zinc-400">Join thousands of students who landed jobs at top companies.</p>
              <Link href="/signup" className="shimmer inline-flex items-center justify-center rounded-full bg-accent px-10 py-4 text-lg font-bold text-zinc-950">
                Start Free Today →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-1 text-xl font-bold tracking-tight mb-2">
              <span className="text-white">Hacker</span>
              <span className="text-accent">Compliment</span>
            </Link>
            <p className="text-sm text-zinc-500">AI Interview Prep for students</p>
          </div>
          
          <div className="flex flex-wrap gap-6 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#history" className="hover:text-white transition-colors">History</a>
            <Link href="/resume" className="hover:text-white transition-colors">Resume</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
        
        <div className="mx-auto max-w-6xl border-t border-zinc-800/60 pt-8 text-center text-xs text-zinc-600">
          © 2026 HackerCompliment. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
