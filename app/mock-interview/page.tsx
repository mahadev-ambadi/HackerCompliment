"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type Step = "setup" | "interview" | "results";

type Question = {
  id?: string;
  question: string;
  company: string;
  role: string;
  interview_type: string;
  difficulty?: string;
};

type Evaluation = {
  score: number;
  feedback: string;
  followUp: string;
  fillerWords: string[];
  fillerCount: number;
};

const experienceLevels = ["Fresher", "1-2 years", "3-5 years", "5+ years"];

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
  "GitHub", "Hugging Face", "Intuitive", "PayPal", "Trimble"
];

const roles = [
  'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Mobile Developer (Android)', 'Mobile Developer (iOS)', 'React Native Developer', 'Flutter Developer',
  'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 'Data Engineer', 'Business Intelligence Analyst',
  'NLP Engineer', 'Computer Vision Engineer',
  'DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer (SRE)', 'AWS Solutions Architect', 'Platform Engineer', 'Infrastructure Engineer',
  'Cybersecurity Analyst', 'Security Engineer', 'Penetration Tester',
  'Product Manager', 'Associate Product Manager', 'UI/UX Designer', 'Product Designer',
  'Business Analyst', 'Systems Analyst', 'Management Consultant', 'IT Consultant', 'ERP Consultant (SAP)', 'Salesforce Developer',
  'QA Engineer', 'Test Automation Engineer', 'Manual Tester',
  'Database Administrator', 'Database Developer',
  'Engineering Manager', 'Technical Lead', 'Scrum Master', 'Project Manager',
  'Quantitative Analyst', 'Fintech Developer',
  'Technical Support Engineer', 'IT Support Specialist', 'Network Engineer', 'Systems Administrator',
  'Other'
];

export default function MockInterviewPage() {
  const [step, setStep] = useState<Step>("setup");
  const [firstName, setFirstName] = useState("Candidate");

  // Setup State
  const [company, setCompany] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [role, setRole] = useState("");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState(experienceLevels[0]);
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [shouldBlock, setShouldBlock] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const filteredCompanies = useMemo(() => {
    if (!company) return companies;
    return companies.filter(c => c.toLowerCase().includes(company.toLowerCase()));
  }, [company]);

  const filteredRoles = useMemo(() => {
    if (!role) return roles;
    return roles.filter(r => r.toLowerCase().includes(role.toLowerCase()));
  }, [role]);

  // Interview State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);

  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(120);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    async function getUser() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        const fullName = data.user.user_metadata?.full_name || data.user.email || "Candidate";
        setFirstName(fullName.split(" ")[0]);
      }
    }
    getUser();
  }, []);

  async function getSessionAuthHeaders() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  }

  useEffect(() => {
    if (step === "setup" && userId) {
      fetchSessionUsage();
    }
  }, [step, userId]);

  async function fetchSessionUsage() {
    setSessionsLoading(true);
    try {
      const authHeaders = await getSessionAuthHeaders();
      const res = await fetch(`/api/session-limit?userId=${userId}`, {
        credentials: "include",
        headers: authHeaders,
        cache: "no-store",
      });
      const data = await res.json();
      setSessionInfo(data);
      if (!data.canStart) {
        setShouldBlock(true);
      } else {
        setShouldBlock(false);
      }
    } catch (err) {
      console.error("Failed to fetch session usage:", err);
    } finally {
      setSessionsLoading(false);
    }
  }

  const determineRounds = (roleStr: string) => {
    const lowerRole = roleStr.toLowerCase();
    if (lowerRole.includes("sde") || lowerRole.includes("developer") || lowerRole.includes("engineer")) {
      return ["HR", "Technical", "Coding"];
    }
    if (lowerRole.includes("data") || lowerRole.includes("ml") || lowerRole.includes("ai")) {
      return ["HR", "Technical"];
    }
    if (lowerRole.includes("business analyst") || lowerRole.includes("consultant")) {
      return ["HR", "Behavioral", "Technical"];
    }
    if (lowerRole.includes("product manager") || lowerRole.includes("pm")) {
      return ["HR", "Behavioral"];
    }
    return ["HR", "Technical"];
  };

  const playAdamVoice = async (text: string) => {
    setIsPlaying(true);
    await new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      utterance.volume = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
    setIsPlaying(false);
  };

  const handleStartInterview = async () => {
    if (!company || !role) {
      setError("Please select both a company and a role.");
      return;
    }

    if (shouldBlock) {
      setError("You've reached your session limit. Please upgrade your plan.");
      return;
    }

    setIsLoadingSetup(true);
    setError(null);

    const rounds = determineRounds(role);
    let allQuestions: Question[] = [];

    try {
      for (const round of rounds) {
        let roundQuestions: Question[] = [];

        // Attempt 1: Full match (company + role + round)
        let res = await fetch("/api/mock-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company, role, interview_type: round, limit: 2 }),
        });
        if (res.ok) {
          const data = await res.json();
          roundQuestions = data.questions || [];
        }

        // Attempt 2: Match company, any role
        if (roundQuestions.length < 2) {
          res = await fetch("/api/mock-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company, role: "", interview_type: round, limit: 2 - roundQuestions.length }),
          });
          if (res.ok) {
            const data = await res.json();
            roundQuestions = [...roundQuestions, ...(data.questions || [])];
          }
        }

        // Attempt 3: Any company, any role
        if (roundQuestions.length < 2) {
          res = await fetch("/api/mock-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company: "", role: "", interview_type: round, limit: 2 - roundQuestions.length }),
          });
          if (res.ok) {
            const data = await res.json();
            roundQuestions = [...roundQuestions, ...(data.questions || [])];
          }
        }

        // Dedupe
        const unique = [];
        const seen = new Set();
        for (const q of roundQuestions) {
          if (!seen.has(q.question)) {
            seen.add(q.question);
            unique.push(q);
          }
        }
        allQuestions = [...allQuestions, ...unique];
      }

      if (allQuestions.length === 0) {
        throw new Error("Could not load any interview questions. Please try again later.");
      }

      setQuestions(allQuestions);
      setStep("interview");
      setCurrentQuestionIndex(0);
      setTranscript("");
      setCurrentEvaluation(null);
      setEvaluations([]);

      // Play first question
      const firstQ = allQuestions[0];
      playAdamVoice(`Hello ${firstName}. Your first question is: ${firstQ.question}`);

    } catch (err: any) {
      showError(err.message || "Failed to start interview");
    } finally {
      setIsLoadingSetup(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(120);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      showError("Microphone access denied or not available. Please type your answer instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: blob, // Send raw blob
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      if (data.transcript) {
        setTranscript(prev => prev ? `${prev} ${data.transcript}` : data.transcript);
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("timed out") || err.message?.includes("failed")) {
        showError("Transcription timed out — please type your answer below");
        textareaRef.current?.focus();
      } else {
        showError(err.message || "Failed to transcribe audio.");
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
      showError("Please provide an answer before submitting");
      return;
    }

    setIsEvaluating(true);
    setError(null);

    try {
      const currentQ = questions[currentQuestionIndex];
      const res = await fetch("/api/mock-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQ.question,
          answer: transcript,
          candidateName: firstName,
          company,
          role,
          interview_type: currentQ.interview_type,
          questionNumber: currentQuestionIndex + 1,
          totalQuestions: questions.length
        }),
      });

      if (!res.ok) throw new Error("Evaluation failed");

      const evalData: Evaluation = await res.json();
      setCurrentEvaluation(evalData);

      // If there's a follow-up and score is low, insert it as the next question
      if (evalData.followUp && evalData.score < 7) {
        const followUpQ: Question = {
          question: evalData.followUp,
          company,
          role,
          interview_type: `${currentQ.interview_type} Follow-up`,
        };
        const newQuestions = [...questions];
        newQuestions.splice(currentQuestionIndex + 1, 0, followUpQ);
        setQuestions(newQuestions);
      }

    } catch (err: any) {
      showError(err.message || "Failed to evaluate answer");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!currentEvaluation) return;

    setEvaluations([...evaluations, currentEvaluation]);

    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTranscript("");
      setCurrentEvaluation(null);

      const nextQ = questions[nextIndex];
      playAdamVoice(`${firstName}, ${nextQ.question}`);
    } else {
      handleEndInterview();
    }
  };

  const handleEndInterview = async () => {
    try {
      if (userId) {
        const authHeaders = await getSessionAuthHeaders();
        await fetch("/api/session-limit", {
          method: "POST",
          headers: authHeaders,
        });
      }
    } catch (err) {
      console.error("Failed to increment session limit", err);
    }
    setStep("results");
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  // --- RENDERING ---

  if (step === "setup") {
    return (
      <div 
        className="h-screen overflow-hidden font-sans text-white flex flex-col bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: "url('/bg2.jpg')" }}
      >
        <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-0.5 text-lg font-bold tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/logo-colored.png" alt="Logo" className="h-7 w-auto sm:h-8 -mr-1" />
              <div className="flex">
                <span className="text-white">Hacker</span>
                <span className="text-[#FF6B2B]">Compliment</span>
              </div>
            </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 py-1 sm:py-2 flex flex-col">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 mb-1">
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-[#FF6B2B] px-5 py-2 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:brightness-110"
            >
              &larr; Back
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-700 bg-black/70 backdrop-blur-lg p-5 shadow-2xl">
            <div className="text-center mb-3">
              <h1 className="text-3xl font-bold tracking-tight drop-shadow-md">
                <span className="text-[#FF6B2B]">AI Mock</span> <span className="text-white">Interview</span>
              </h1>
              <p className="text-zinc-300 mt-1 text-sm drop-shadow-sm">Powered by real interview questions</p>
            </div>

            <div className="mt-2 mb-3 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 px-4 py-1.5 text-sm font-medium text-[#FF6B2B]">
              {sessionsLoading ? (
                "Loading session usage..."
              ) : sessionInfo?.isUnlimitedPlan ? (
                <>{sessionInfo.unlimitedLabel || "Unlimited Access"}</>
              ) : sessionInfo ? (
                <>
                  {Math.min(sessionInfo.sessions_used, sessionInfo.limit)} of {sessionInfo.limit} {sessionInfo.planName === 'free' ? 'free ' : ''}sessions used{sessionInfo.planName === 'free' ? ' this week' : ''}
                </>
              ) : null}
              </span>
            </div>

          <div className="space-y-3">
            <div className="relative">
              <label className="block text-sm font-semibold text-zinc-100 mb-1.5">Company</label>
              <input
                type="text"
                value={company}
                onFocus={() => setShowCompanyDropdown(true)}
                onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                onChange={e => {
                  setCompany(e.target.value);
                  setShowCompanyDropdown(true);
                }}
                placeholder="e.g. Google, TCS, Amazon"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-2.5 text-sm text-white focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]"
                autoComplete="off"
              />
              {showCompanyDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[250px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((c) => (
                      <div
                        key={c}
                        onMouseDown={() => {
                          setCompany(c);
                          setShowCompanyDropdown(false);
                        }}
                        className="cursor-pointer px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      >
                        {c}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-zinc-500">
                      Custom company will be added
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-zinc-100 mb-1.5">Role</label>
              <input
                type="text"
                value={role}
                onFocus={() => setShowRoleDropdown(true)}
                onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
                onChange={e => {
                  setRole(e.target.value);
                  setShowRoleDropdown(true);
                }}
                placeholder="e.g. Frontend Engineer, Data Scientist"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-2.5 text-sm text-white focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]"
                autoComplete="off"
              />
              {showRoleDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[250px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                  {filteredRoles.length > 0 ? (
                    filteredRoles.map((r) => (
                      <div
                        key={r}
                        onMouseDown={() => {
                          setRole(r);
                          setShowRoleDropdown(false);
                        }}
                        className="cursor-pointer px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      >
                        {r}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-zinc-500">
                      Custom role will be added
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-100 mb-1.5">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={e => setExperienceLevel(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-2.5 text-sm text-white focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B] appearance-none"
              >
                {experienceLevels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div className="pt-2 text-center">
              <p className="text-zinc-400 text-sm mb-2">Ready, <span className="text-[#FF6B2B] font-semibold">{firstName}</span>?</p>
              {shouldBlock && (
                <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                  You've used all {sessionInfo?.limit} of your interview sessions this week.<br />
                  <Link href="/pricing" className="text-[#FF6B2B] underline font-bold mt-1 inline-block">Upgrade to Pro</Link> for unlimited practice.
                </div>
              )}
              <button
                onClick={handleStartInterview}
                disabled={isLoadingSetup || shouldBlock}
                className="relative w-full rounded-xl bg-[#FF6B2B] px-6 py-2.5 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100 overflow-hidden group"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                {isLoadingSetup ? "Preparing Interview..." : "Start Interview"}
              </button>
            </div>
          </div>
        </div>
        </main>
        
        {error && (
          <div className="fixed bottom-6 right-6 bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl shadow-lg z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (step === "interview") {
    const currentQ = questions[currentQuestionIndex];
    const scoreSoFar = evaluations.length > 0
      ? Math.round(evaluations.reduce((acc, curr) => acc + curr.score, 0) / evaluations.length)
      : 0;

    return (
      <div className="min-h-screen bg-zinc-950 font-sans text-white flex flex-col">
        {/* Top Bar */}
        <header className="border-b border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md px-6 py-4 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 sm:gap-0">
          <div>
            <Link href="/dashboard" className="flex items-center gap-0.5 text-lg font-bold tracking-tight mb-1 hover:opacity-80 transition-opacity" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/logo-colored.png" alt="Logo" className="h-7 w-auto sm:h-8 -mr-1" />
              <div className="flex">
                <span className="text-white">Hacker</span>
                <span className="text-[#FF6B2B]">Compliment</span>
              </div>
            </Link>
            <h2 className="font-bold text-lg leading-tight">{company}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{role}</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-sm font-medium text-zinc-300">Question {currentQuestionIndex + 1} of {questions.length}</p>
            <div className="w-32 h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden mx-auto">
              <div
                className="h-full bg-[#FF6B2B] transition-all duration-500"
                style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-zinc-400">Current Score</p>
              <p className="font-bold text-lg text-[#FF6B2B]">{scoreSoFar ? `${scoreSoFar}/10` : '--'}</p>
            </div>
            <button
              onClick={handleEndInterview}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors border border-red-500/30 bg-red-500/10 px-3 py-1.5 rounded-lg"
            >
              End Interview
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 lg:p-12 max-w-7xl mx-auto w-full">
          {/* Left Panel */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-zinc-300 w-fit">
              {currentQ.interview_type}
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold leading-tight text-white">
              "{currentQ.question}"
            </h1>

            <div className="flex flex-col items-start gap-4 mt-8">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  {isPlaying && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B2B] opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlaying ? 'bg-[#FF6B2B]' : 'bg-zinc-700'}`}></span>
                </div>
                <p className="text-sm text-zinc-400 font-medium">Adam is asking...</p>
              </div>

              {!isPlaying && (
                <button
                  onClick={() => playAdamVoice(`Hello ${firstName}, ${currentQ.question}`)}
                  className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-black/80 hover:text-white border border-zinc-700 shadow-xl"
                >
                  <span className="text-[10px]">🔁</span> Replay question
                </button>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col rounded-3xl border border-zinc-700 bg-black/60 shadow-2xl backdrop-blur-lg p-6 lg:p-8 relative">
            {!currentEvaluation ? (
              <>
                <h3 className="text-lg font-semibold mb-6">Your turn, <span className="text-[#FF6B2B]">{firstName}</span></h3>

                <div className="flex flex-col items-center justify-center mb-8">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${isRecording
                        ? 'bg-red-500/20 border-4 border-red-500 animate-pulse'
                        : 'bg-zinc-800 border-4 border-zinc-700 hover:border-zinc-600'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${isRecording ? 'bg-red-500' : 'bg-zinc-500'}`} />
                  </button>
                  <p className={`mt-4 text-sm font-medium ${isRecording ? 'text-red-400' : 'text-zinc-500'}`}>
                    {isRecording ? `Recording... Auto-stop in ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}` : "Click to record answer"}
                  </p>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Or type your answer</label>
                  <textarea
                    ref={textareaRef}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Your answer will appear here..."
                    className="w-full flex-1 min-h-[150px] rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-white focus:border-[#FF6B2B] focus:outline-none resize-none"
                  />
                  {isTranscribing && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF6B2B] border-t-transparent"></div>
                      <p className="text-xs text-[#FF6B2B] animate-pulse">Transcribing audio (this may take a moment)...</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={isRecording || isTranscribing || isEvaluating || !transcript.trim()}
                  className="mt-6 w-full rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 disabled:opacity-50"
                >
                  {isEvaluating ? "Evaluating..." : "Submit Answer"}
                </button>
              </>
            ) : (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold">Feedback</h3>
                  <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${currentEvaluation.score >= 7 ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                      currentEvaluation.score >= 5 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                        'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                    Score: {currentEvaluation.score}/10
                  </div>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                  <div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{currentEvaluation.feedback}</p>
                  </div>

                  {currentEvaluation.fillerWords.length > 0 && (
                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Filler Words Detected ({currentEvaluation.fillerCount})</p>
                      <div className="flex flex-wrap gap-2">
                        {currentEvaluation.fillerWords.map((word, i) => (
                          <span key={i} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded border border-orange-500/20">
                            "{word}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentEvaluation.followUp && currentEvaluation.score < 7 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">Follow-up triggered</p>
                      <p className="text-sm text-blue-200">A follow-up question has been added based on your answer.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="mt-6 w-full rounded-xl bg-[#FF6B2B] px-6 py-3.5 text-sm font-bold text-black transition-all hover:brightness-110"
                >
                  {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Complete Interview"}
                </button>
              </div>
            )}
          </div>
        </main>
        {error && (
          <div className="fixed bottom-6 right-6 bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl shadow-lg z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (step === "results") {
    const overallScore = evaluations.length > 0
      ? Math.round(evaluations.reduce((acc, curr) => acc + curr.score, 0) / evaluations.length)
      : 0;

    const totalFillers = evaluations.reduce((acc, curr) => acc + curr.fillerCount, 0);

    // Group scores by round type
    const roundScores: Record<string, { total: number, count: number }> = {};
    evaluations.forEach((e, i) => {
      const type = questions[i].interview_type;
      if (!roundScores[type]) roundScores[type] = { total: 0, count: 0 };
      roundScores[type].total += e.score;
      roundScores[type].count += 1;
    });

    return (
      <div className="min-h-screen bg-zinc-950 font-sans text-white flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10 animate-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Interview Complete! 🎉</h1>
            <p className="text-lg text-zinc-400">Great job stepping up, {firstName}. Here is your performance overview.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 rounded-3xl border border-zinc-700 bg-black/60 shadow-2xl backdrop-blur-lg p-8 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF6B2B] to-transparent opacity-50" />
              <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-2">Overall Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-7xl font-black ${overallScore >= 8 ? 'text-green-500' :
                    overallScore >= 5 ? 'text-yellow-500' : 'text-[#FF6B2B]'
                  }`}>{overallScore}</span>
                <span className="text-2xl text-zinc-600 font-bold">/10</span>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-8 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-2 text-center">Filler Words</p>
              <span className="text-5xl font-bold text-white">{totalFillers}</span>
              <p className="text-xs text-zinc-500 mt-2 text-center">Used across {evaluations.length} answers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
              <h3 className="text-lg font-bold mb-4">Round Breakdown</h3>
              <div className="space-y-4">
                {Object.keys(roundScores).length > 0 ? (
                  Object.entries(roundScores).map(([round, data]) => (
                    <div key={round}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-zinc-300">{round}</span>
                        <span className="font-bold">{Math.round(data.total / data.count)}/10</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-500" style={{ width: `${(Math.round(data.total / data.count) / 10) * 100}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No rounds were completed.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-black/60 shadow-xl backdrop-blur-md p-6">
              <h3 className="text-lg font-bold mb-4">Top Feedback</h3>
              <ul className="space-y-3">
                {evaluations.length === 0 ? (
                  <li className="text-sm text-zinc-500">You ended the interview before answering any questions.</li>
                ) : (
                  <>
                    {evaluations.filter(e => e.score < 8).slice(0, 3).map((e, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-[#FF6B2B] mt-0.5">→</span>
                        <span className="text-zinc-400 leading-relaxed">{e.feedback}</span>
                      </li>
                    ))}
                    {evaluations.filter(e => e.score < 8).length === 0 && (
                      <li className="text-sm text-green-400">Excellent performance across the board! Keep up the great work.</li>
                    )}
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setStep("setup")}
              className="rounded-xl bg-[#FF6B2B] px-8 py-3.5 text-sm font-bold text-black transition-all hover:scale-105 hover:brightness-110"
            >
              Practice Again
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-8 py-3.5 text-sm font-bold text-white text-center transition-all hover:bg-zinc-800"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
