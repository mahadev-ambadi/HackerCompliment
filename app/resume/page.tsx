"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import type { ResumeAnalysisResult } from "@/app/api/analyze-resume/route";

type Step = "upload" | "results";

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

const companies = [
  "TCS", "Wipro", "Infosys", "Cognizant", "HCL", "Tech Mahindra", "Mphasis",
  "Hexaware", "L&T Infotech", "Persistent Systems", "NIIT Technologies", "Mindtree",
  "Mastech", "Zensar", "Cyient", "Sonata Software", "Tata Elxsi", "KPIT Technologies",
  "Flipkart", "Zomato", "Swiggy", "Paytm", "PhonePe", "Ola", "BYJU'S",
  "Meesho", "Razorpay", "Freshworks", "Zoho", "Zepto", "Cred", "Dream11", "Nykaa",
  "Policybazaar", "Lenskart", "Dunzo", "Urban Company", "BigBasket", "Udaan",
  "Groww", "Zerodha", "Upstox", "Slice", "BrowserStack", "Postman", "Chargebee",
  "Hasura", "Clevertap", "MoEngage", "Mixpanel India", "Druva", "Innovaccer",
  "Google", "Amazon", "AWS", "Microsoft", "Meta", "Apple", "Netflix", "Uber",
  "Airbnb", "LinkedIn", "Twitter", "Salesforce", "Adobe", "Oracle", "IBM", "SAP",
  "Cisco", "Intel", "Qualcomm", "Texas Instruments", "Nvidia", "Atlassian",
  "Stripe", "Square", "Shopify", "Spotify", "Snap", "Pinterest", "Reddit",
  "Dropbox", "Box", "Slack", "Zoom", "HubSpot", "Workday", "ServiceNow",
  "Goldman Sachs", "JPMorgan", "Morgan Stanley", "Deutsche Bank",
  "Barclays", "HSBC", "Citi", "McKinsey", "BCG", "Bain", "Deloitte", "Accenture",
  "EY", "PwC", "KPMG", "Capgemini", "Wipro Consulting", "GlobalLogic",
  "Anthropic", "Canva", "Cloudflare", "Datadog", "DeepSeek", "Discord", "Figma", 
  "GitHub", "Hugging Face", "Intuitive", "PayPal", "Trimble", "Any Company"
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getScoreColor(score: number) {
  if (score < 50) return "text-red-400";
  if (score < 70) return "text-yellow-400";
  return "text-[#FF6B2B]";
}

function getScoreStroke(score: number) {
  if (score < 50) return "stroke-red-400";
  if (score < 70) return "stroke-yellow-400";
  return "stroke-[#FF6B2B]";
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
  "w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/30 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10";

export default function ResumePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState(roles[0]);
  const [targetCompany, setTargetCompany] = useState(companies[0]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const filteredRoles = useMemo(() => {
    if (!targetRole) return roles;
    return roles.filter(r => r.toLowerCase().includes(targetRole.toLowerCase()));
  }, [targetRole]);

  const filteredCompanies = useMemo(() => {
    if (!targetCompany) return companies;
    return companies.filter(c => c.toLowerCase().includes(targetCompany.toLowerCase()));
  }, [targetCompany]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysisResult | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [fixData, setFixData] = useState<any>(null);
  const [fixing, setFixing] = useState(false);
  const [rebuiltResumeText, setRebuiltResumeText] = useState("");
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'analyze' | 'jdmatch'>('analyze');
  const [jdInputType, setJdInputType] = useState<'paste' | 'upload'>('paste');
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdMatchData, setJdMatchData] = useState<any>(null);
  const [jdMatching, setJdMatching] = useState(false);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  const [fixesUsed, setFixesUsed] = useState(0);
  const [fixesLimit, setFixesLimit] = useState(3);
  const [isUnlimitedFixes, setIsUnlimitedFixes] = useState(false);

  useEffect(() => {
    async function checkLimits() {
      try {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch("/api/session-limit", { headers });
        const data = await res.json();
        
        if (data.isUnlimitedPlan) {
          setIsUnlimitedFixes(true);
        } else {
          let limit = 3;
          if (data.planName === 'basic') limit = 6;
          if (data.planName === 'standard') limit = 9;
          setFixesLimit(limit);
        }
        
        const used = parseInt(localStorage.getItem(`resume_fixes_${userId}`) || '0');
        setFixesUsed(used);
      } catch (err) {
        console.error("Failed to check limits", err);
      }
    }
    checkLimits();
  }, []);

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
    setFixData(null);
    setRebuiltResumeText("");
    setPreviousScore(null);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files[0] ?? null);
  }

  const validateAndSetJdFile = useCallback((selected: File | null) => {
    if (!selected) return;
    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please upload a JD PDF file.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("File size exceeds 5MB limit.");
      return;
    }
    setJdFile(selected);
    setError(null);
  }, []);

  function handleJdDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false); // Can share isDragging state or separate it, will use a quick inline for JD if needed, but here we just process the drop
    validateAndSetJdFile(e.dataTransfer.files[0] ?? null);
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
    setAnalysis(null);
    setFile(null);
    setFixData(null);
    setRebuiltResumeText('');
    setPreviousScore(null);
    setTargetRole('Software Engineer');
    setTargetCompany('TCS');
    setResumeText(null);
    setJdMatchData(null);
    setJdFile(null);
    setJdText('');
    setError(null);
    
    // Reset all file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => {
      (input as HTMLInputElement).value = '';
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (jdFileInputRef.current) jdFileInputRef.current.value = "";
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleJDMatch() {
    if (!file) {
      setError("Please upload your resume PDF first.");
      return;
    }
    
    if (jdInputType === 'paste' && (!jdText || jdText.trim().length < 20)) {
      setError("Please paste a valid job description.");
      return;
    }

    if (jdInputType === 'upload' && !jdFile) {
      setError("Please upload a JD PDF.");
      return;
    }

    setJdMatching(true);
    setError(null);

    try {
      let finalResumeText = resumeText;
      if (!finalResumeText) {
        const extractForm = new FormData();
        extractForm.append("resume", file);
        const extractRes = await fetch("/api/extract-pdf", {
          method: "POST",
          body: extractForm,
        });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error || "Failed to extract Resume text.");
        finalResumeText = extractData.text;
        setResumeText(finalResumeText);
      }

      let finalJdText = jdText;
      if (jdInputType === 'upload' && jdFile) {
        const jdForm = new FormData();
        jdForm.append("resume", jdFile); 
        const extractJdRes = await fetch("/api/extract-pdf", {
          method: "POST",
          body: jdForm,
        });
        const extractJdData = await extractJdRes.json();
        if (!extractJdRes.ok) throw new Error(extractJdData.error || "Failed to extract JD text.");
        finalJdText = extractJdData.text;
      }

      const matchRes = await fetch("/api/match-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: finalResumeText,
          jdText: finalJdText,
        }),
      });

      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error || "JD Match failed.");

      setJdMatchData(matchData);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match failed. Please retry.");
    } finally {
      setJdMatching(false);
    }
  }
  async function handleFixResume() {
    if (!resumeText || !analysis) return;
    if (!isUnlimitedFixes && fixesUsed >= fixesLimit) return;
    
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
      
      if (!isUnlimitedFixes) {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          const newUsed = fixesUsed + 1;
          localStorage.setItem(`resume_fixes_${userId}`, newUsed.toString());
          setFixesUsed(newUsed);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fix resume. Please try again.");
    } finally {
      setFixing(false);
    }
  }

  async function handleApplyFixes() {
    if (!fixData || !resumeText || !analysis) return;

    // Use the comprehensive AI-rebuilt resume text if available,
    // otherwise fallback to the original text (so it doesn't fail parsing)
    const rebuiltResume = fixData.fullRewrittenResumeText || resumeText;

    setRebuiltResumeText(rebuiltResume);
  }

  async function handleReanalyze() {
    if (!rebuiltResumeText) return;
    
    setReanalyzing(true);
    setPreviousScore(analysis?.atsScore || null);
    
    try {
      const analyzeRes = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: rebuiltResumeText,
          targetRole,
          targetCompany,
        }),
      });
      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || "Re-analysis failed.");
      }

      setAnalysis(analyzeData as ResumeAnalysisResult);
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Re-analysis failed.");
    } finally {
      setReanalyzing(false);
    }
  }

  return (
    <div 
      className="h-screen overflow-hidden font-sans text-white flex flex-col bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/bg3.jpg')" }}
    >
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-0.5 text-lg font-bold tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/logo-colored.png" alt="Logo" className="h-7 w-auto sm:h-8 -mr-1" />
              <div className="flex">
                <span className="text-white">Hacker</span>
                <span className="text-[#FF6B2B]">Compliment</span>
              </div>
            </Link>
            <span className="text-xs text-zinc-500 sm:text-sm">Resume Analyzer</span>
          </div>
        </div>
      </header>

      <main className="flex-1 py-1 sm:py-2 overflow-y-auto custom-scrollbar">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-2">
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-[#FF6B2B] px-5 py-2 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:brightness-110"
          >
            &larr; Back
          </Link>
        </div>
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {step === "upload" && (
          <div className="mb-4 flex justify-center">
            <div className="flex gap-2 rounded-xl border border-zinc-700 bg-black/70 backdrop-blur-md p-1 shadow-xl">
              <button
                onClick={() => setActiveTab('analyze')}
                className={`rounded-lg px-6 py-2 transition-colors ${
                  activeTab === 'analyze'
                    ? "bg-[#FF6B2B] font-bold text-black shadow-md"
                    : "text-zinc-300 font-medium hover:text-white"
                }`}
              >
                📄 Resume Analyzer
              </button>
              <button
                onClick={() => setActiveTab('jdmatch')}
                className={`rounded-lg px-6 py-2 transition-colors ${
                  activeTab === 'jdmatch'
                    ? "bg-[#FF6B2B] font-bold text-black shadow-md"
                    : "text-zinc-300 font-medium hover:text-white"
                }`}
              >
                🎯 JD Match
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
        />

        {step === "upload" && activeTab === "analyze" && (
          <div className="transition-opacity duration-300 flex flex-col items-center">
            <div className="mb-3 text-center inline-block bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-zinc-800/50">
              <h1 className="text-3xl font-bold text-white sm:text-4xl drop-shadow-md"><span className="text-[#FF6B2B]">AI Resume</span> Analyzer</h1>
              <p className="mt-1 text-sm text-zinc-300 drop-shadow-sm">
                Find out if your resume will pass ATS screening
              </p>
            </div>

            <div className="w-full rounded-2xl border border-zinc-700 bg-black/70 backdrop-blur-lg p-5 sm:p-6 shadow-2xl">
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
                    ? "border-[#FF6B2B] bg-[#FF6B2B]/5"
                    : "border-zinc-700 bg-zinc-800/30"
                }`}
              >
                <span className="text-5xl">📄</span>
                <p className="mt-4 text-lg font-semibold text-white">Drop your resume here</p>
                <p className="mt-1 text-sm text-zinc-500">Supports PDF files up to 5MB</p>
                {file && (
                  <p className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-[#FF6B2B]">
                    {file.name}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="mt-6 rounded-xl bg-[#FF6B2B] px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:opacity-60"
                >
                  Click to browse
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <label htmlFor="targetRole" className="mb-1.5 block text-sm font-semibold text-zinc-100">
                    Target Role
                  </label>
                  <input
                    type="text"
                    id="targetRole"
                    value={targetRole}
                    onFocus={() => setShowRoleDropdown(true)}
                    onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
                    onChange={(e) => {
                      setTargetRole(e.target.value);
                      setShowRoleDropdown(true);
                    }}
                    disabled={loading}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/30"
                    placeholder="E.g. Software Engineer"
                    autoComplete="off"
                  />
                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[250px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl custom-scrollbar">
                      {filteredRoles.length > 0 ? (
                        filteredRoles.map((r) => (
                          <div
                            key={r}
                            onMouseDown={() => {
                              setTargetRole(r);
                              setShowRoleDropdown(false);
                            }}
                            className="cursor-pointer px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            {r}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500">No matching roles</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label htmlFor="targetCompany" className="mb-1.5 block text-sm font-semibold text-zinc-100">
                    Target Company
                  </label>
                  <input
                    type="text"
                    id="targetCompany"
                    value={targetCompany}
                    onFocus={() => setShowCompanyDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                    onChange={(e) => {
                      setTargetCompany(e.target.value);
                      setShowCompanyDropdown(true);
                    }}
                    disabled={loading}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/30"
                    placeholder="E.g. Google"
                    autoComplete="off"
                  />
                  {showCompanyDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[250px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl custom-scrollbar">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((c) => (
                          <div
                            key={c}
                            onMouseDown={() => {
                              setTargetCompany(c);
                              setShowCompanyDropdown(false);
                            }}
                            className="cursor-pointer px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            {c}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500">No matching companies</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !file}
                className="mt-6 w-full rounded-xl bg-[#FF6B2B] py-4 text-base font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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

        {step === "upload" && activeTab === "jdmatch" && (
          <div className="transition-opacity duration-300 flex flex-col items-center">
            <div className="mb-3 text-center inline-block bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-zinc-800/50">
              <h1 className="text-3xl font-bold text-white sm:text-4xl drop-shadow-md">JD Match</h1>
              <p className="mt-1 text-sm text-zinc-300 drop-shadow-sm">
                Compare your resume against a specific job description
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 w-full">
              {/* Left: Resume Upload */}
              <div className="rounded-2xl border border-zinc-700 bg-black/70 backdrop-blur-lg p-6 shadow-2xl">
                <h3 className="mb-4 text-lg font-semibold text-white">Upload Your Resume (PDF)</h3>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-8 transition-colors ${
                    isDragging
                      ? "border-[#FF6B2B] bg-[#FF6B2B]/5"
                      : "border-zinc-700 bg-zinc-800/30"
                  }`}
                >
                  <span className="text-4xl">📄</span>
                  <p className="mt-4 font-semibold text-white">Drop your resume here</p>
                  <p className="mt-1 text-xs text-zinc-500">Supports PDF files up to 5MB</p>
                  {file && (
                    <p className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-[#FF6B2B]">
                      {file.name}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={jdMatching}
                    className="mt-6 rounded-xl bg-zinc-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                  >
                    Browse Files
                  </button>
                </div>
              </div>

              {/* Right: JD Input */}
              <div className="rounded-2xl border border-zinc-700 bg-black/70 backdrop-blur-lg p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Job Description</h3>
                  <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
                    <button
                      onClick={() => setJdInputType('paste')}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        jdInputType === 'paste' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Paste
                    </button>
                    <button
                      onClick={() => setJdInputType('upload')}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        jdInputType === 'upload' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Upload PDF
                    </button>
                  </div>
                </div>

                {jdInputType === 'paste' ? (
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="h-[212px] w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 text-sm text-white outline-none transition-colors focus:border-[#FF6B2B]/50 focus:ring-1 focus:ring-[#FF6B2B]/30"
                  />
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleJdDrop}
                    className="flex h-[212px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 px-6 py-8"
                  >
                    <span className="text-4xl">📋</span>
                    <p className="mt-4 font-semibold text-white">Drop JD PDF here</p>
                    {jdFile && (
                      <p className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-[#FF6B2B]">
                        {jdFile.name}
                      </p>
                    )}
                    <input
                      ref={jdFileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => validateAndSetJdFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => jdFileInputRef.current?.click()}
                      className="mt-4 rounded-xl bg-zinc-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={handleJDMatch}
                disabled={jdMatching || !file || (jdInputType === 'paste' && !jdText) || (jdInputType === 'upload' && !jdFile)}
                className="w-full rounded-xl bg-[#FF6B2B] py-4 text-base font-bold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {jdMatching ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    Analyzing match...
                  </span>
                ) : (
                  "Analyze Match"
                )}
              </button>
            </div>
          </div>
        )}

        {step === "results" && activeTab === "analyze" && analysis && (
          <div ref={resultsRef} className="transition-opacity duration-300">
            {/* ATS Score Card */}
            <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-2xl backdrop-blur-lg p-8 text-center">
              <CircularScore score={analysis.atsScore} />
              {previousScore !== null && (
                <div className="mt-4 flex justify-center">
                  <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold shadow-lg ${
                    analysis.atsScore > previousScore
                      ? "bg-[#FF6B2B]/20 text-[#FF6B2B] border border-[#FF6B2B]/30"
                      : analysis.atsScore < previousScore
                      ? "bg-red-500/20 text-red-500 border border-red-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}>
                    {analysis.atsScore > previousScore
                      ? `📈 +${analysis.atsScore - previousScore} points improved!`
                      : analysis.atsScore < previousScore
                      ? `📉 ${previousScore - analysis.atsScore} points decreased`
                      : "Score unchanged"}
                  </span>
                </div>
              )}
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
                  className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-5 text-center transition-transform hover:-translate-y-1"
                >
                  <p className="text-xs text-zinc-500 sm:text-sm">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${getScoreColor(card.value)}`}>
                    {card.value}
                    <span className="text-sm font-normal text-zinc-500">/100</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Section Breakdown */}
            {analysis.sectionScores && (
              <div className="mt-8 rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
                <h3 className="mb-6 text-lg font-semibold text-white">📋 Section Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { label: "Contact Info", score: analysis.sectionScores.contact, max: 20 },
                    { label: "Professional Summary", score: analysis.sectionScores.professionalSummary, max: 15 },
                    { label: "Skills", score: analysis.sectionScores.skills, max: 20 },
                    { label: "Work History", score: analysis.sectionScores.workHistory, max: 25 },
                    { label: "Education", score: analysis.sectionScores.education, max: 10 },
                    { label: "Formatting", score: analysis.sectionScores.formatting, max: 10 },
                  ].map((item) => {
                    const value = item.score || 0;
                    const percent = Math.min(100, Math.max(0, (value / item.max) * 100));
                    
                    let colorClass = "bg-red-500";
                    if (percent >= 50 && percent <= 75) colorClass = "bg-yellow-400";
                    else if (percent > 75) colorClass = "bg-[#FF6B2B]";

                    return (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-zinc-300">{item.label}</span>
                          <span className="text-zinc-500">{value}/{item.max}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${colorClass}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Keywords */}
            <div className="mt-8 rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
              <h3 className="text-lg font-semibold text-white">Keywords Analysis</h3>
              <div className="mt-4">
                <p className="text-sm font-medium text-[#FF6B2B]">Keywords Found</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.keywordsFound.length > 0 ? (
                    analysis.keywordsFound.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-lg border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-3 py-1 text-xs font-medium text-[#FF6B2B]"
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
            <div className="mt-6 rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
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
            <div className="mt-6 rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
              <h3 className="text-lg font-semibold text-white">Improvement Suggestions</h3>
              <ol className="mt-4 space-y-3">
                {analysis.suggestions.map((suggestion, i) => (
                  <li key={suggestion} className="flex gap-3 text-sm text-zinc-300">
                    <span className="shrink-0 text-[#FF6B2B]">✅</span>
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
                <>
                  <button
                    type="button"
                    onClick={handleFixResume}
                    disabled={!isUnlimitedFixes && fixesUsed >= fixesLimit}
                    className="rounded-xl bg-[#FF6B2B] px-8 py-3 text-base font-bold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg shadow-[#FF6B2B]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:brightness-100"
                  >
                    ✨ Fix My Resume with AI
                  </button>
                  {!isUnlimitedFixes && (
                    <div className="mt-4 rounded-xl border border-zinc-700/50 bg-black/60 px-4 py-2 shadow-xl backdrop-blur-md">
                      <p className="text-sm font-medium drop-shadow-sm">
                        {fixesUsed >= fixesLimit ? (
                          <span className="text-red-400">Free limit reached. Upgrade for more fixes!</span>
                        ) : (
                          <span className="text-zinc-300">{fixesLimit - fixesUsed} free fixes remaining</span>
                        )}
                      </p>
                    </div>
                  )}
                </>
              )}
              {fixing && (
                <p className="text-center font-medium text-[#FF6B2B]">
                  🔄 AI is rewriting your resume...
                </p>
              )}
            </div>

            {/* Fix Data Results */}
            {fixData && (
              <div className="mt-8 space-y-6">
                {/* Section A — Professional Summary */}
                <div className="relative rounded-2xl border border-zinc-700 border-l-4 border-l-[#FF6B2B] bg-black/60 shadow-xl backdrop-blur-md p-6">
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
                <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
                  <h3 className="text-lg font-semibold text-white">📝 Rewritten Bullet Points</h3>
                  <div className="mt-6 space-y-6">
                    {fixData.beforeAfterBullets?.map((item: any, i: number) => (
                      <div key={i} className="space-y-3">
                        <h4 className="text-sm font-semibold text-[#FF6B2B]">{item.section}</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                            <p className="mb-2 text-xs font-medium uppercase text-red-400">Before</p>
                            <p className="text-sm text-red-400 line-through opacity-80">{item.before}</p>
                          </div>
                          <div className="rounded-xl border border-[#FF6B2B]/20 bg-[#FF6B2B]/10 p-4">
                            <p className="mb-2 text-xs font-medium uppercase text-[#FF6B2B]">After</p>
                            <p className="text-sm font-medium text-[#FF6B2B]">{item.after}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section C — Skills To Add */}
                <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
                  <h3 className="text-lg font-semibold text-white">🎯 Add These Skills to Your Resume</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {fixData.skillsToAdd?.map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-3 py-1 text-sm font-medium text-[#FF6B2B]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Section D — Quick Wins */}
                <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
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

            {fixData && (
              <div className="mt-8">
                <button
                  onClick={handleApplyFixes}
                  className="w-full rounded-xl bg-[#FF6B2B] py-4 text-base font-bold text-black transition-all duration-200 hover:scale-105 hover:brightness-110"
                >
                  ✨ Apply All AI Fixes & Rebuild Resume
                </button>
              </div>
            )}

            {rebuiltResumeText && (
              <div className="mt-8">
                <h3 className="mb-4 text-lg font-semibold text-white">📄 Your Improved Resume</h3>
                <div className="relative rounded-2xl border border-[#FF6B2B]/30 bg-zinc-900 p-6">
                  <button
                    onClick={() => navigator.clipboard.writeText(rebuiltResumeText)}
                    className="absolute right-4 top-4 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                  >
                    📋 Copy
                  </button>
                  <div className="whitespace-pre-wrap font-mono text-sm text-zinc-300">
                    {rebuiltResumeText}
                  </div>
                </div>
                
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="mt-6 w-full rounded-xl bg-[#FF6B2B] py-4 text-base font-bold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:brightness-100"
                >
                  {reanalyzing ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      🔄 Re-analyzing improved resume...
                    </span>
                  ) : (
                    "🔄 Re-Analyze This Resume"
                  )}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleAnalyzeAnother}
                className="rounded-xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md px-8 py-3 text-sm font-semibold text-white transition-all hover:border-[#FF6B2B]/50 hover:bg-black/80 sm:min-w-[220px]"
              >
                Analyze Another Resume
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl bg-[#FF6B2B] px-8 py-3 text-center text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 sm:min-w-[220px]"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {step === "results" && activeTab === "jdmatch" && jdMatchData && (
          <div className="transition-opacity duration-300">
            {/* TOP - Match Score Circle */}
            <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-2xl backdrop-blur-lg p-8 text-center">
              <CircularScore score={jdMatchData.matchScore} />
              <h2 className="mt-6 text-xl font-semibold text-white">JD Match Score</h2>
              <p className={`mt-2 text-lg font-bold ${getScoreColor(jdMatchData.matchScore)}`}>
                {jdMatchData.matchRating}
              </p>
              
              <div className="mt-4 flex justify-center">
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
                  jdMatchData.atsWillPass ? 'bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {jdMatchData.atsWillPass ? "✅ ATS Will Pass" : "❌ ATS Will Fail"}
                </span>
              </div>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
                {jdMatchData.summary}
              </p>
            </div>

            {/* MIDDLE - Skills */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
                <h3 className="text-lg font-semibold text-white">✅ Matched Skills</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {jdMatchData.matchedSkills?.length > 0 ? (
                    jdMatchData.matchedSkills.map((skill: string) => (
                      <span key={skill} className="rounded-lg border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-3 py-1 text-xs font-medium text-[#FF6B2B]">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-500">No matching skills found</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
                <h3 className="text-lg font-semibold text-white">❌ Missing Skills</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {jdMatchData.missingSkills?.length > 0 ? (
                    jdMatchData.missingSkills.map((skill: string) => (
                      <span key={skill} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-500">No missing skills</span>
                  )}
                </div>
              </div>
            </div>

            {/* Below that - Requirements */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
                <h3 className="text-lg font-semibold text-white">✅ Requirements Met</h3>
                <ul className="mt-4 space-y-3">
                  {jdMatchData.matchedRequirements?.length > 0 ? (
                    jdMatchData.matchedRequirements.map((req: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-[#FF6B2B]">
                        <span>✓</span>
                        <span className="text-zinc-300">{req}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-zinc-500">No requirements met</li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
                <h3 className="text-lg font-semibold text-white">❌ Requirements Missing</h3>
                <ul className="mt-4 space-y-3">
                  {jdMatchData.missingRequirements?.length > 0 ? (
                    jdMatchData.missingRequirements.map((req: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-red-400">
                        <span>✕</span>
                        <span className="text-zinc-300">{req}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-zinc-500">No missing requirements</li>
                  )}
                </ul>
              </div>
            </div>

            {/* BOTTOM - Experience Match */}
            <div className="mt-6 rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6 flex flex-col items-center">
              <h3 className="text-sm font-medium text-zinc-400">Experience Level Match</h3>
              <span className={`mt-3 inline-block rounded-full px-6 py-2 text-sm font-bold ${
                jdMatchData.experienceMatch === 'Perfect Match' ? 'bg-[#FF6B2B]/20 text-[#FF6B2B]' :
                jdMatchData.experienceMatch === 'Overqualified' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {jdMatchData.experienceMatch}
              </span>
            </div>

            {/* BOTTOM - Recommendations */}
            <div className="mt-6 rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
              <h3 className="text-lg font-semibold text-white">🚀 How to Improve Your Match</h3>
              <div className="mt-4 space-y-4">
                {jdMatchData.topRecommendations?.map((rec: string, i: number) => (
                  <div key={i} className="flex gap-4 rounded-xl border border-zinc-800 border-l-4 border-l-[#FF6B2B] bg-zinc-900/60 p-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B]/20 text-xs font-bold text-[#FF6B2B]">
                      {i + 1}
                    </span>
                    <p className="text-sm text-zinc-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleAnalyzeAnother}
                className="rounded-xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md px-8 py-3 text-sm font-semibold text-white transition-all hover:border-[#FF6B2B]/50 hover:bg-black/80 sm:min-w-[220px]"
              >
                Analyze Another Resume
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl bg-[#FF6B2B] px-8 py-3 text-center text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:brightness-110 sm:min-w-[220px]"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
