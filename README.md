# HackerCompliment

> **AI-powered interview preparation platform for Indian students and freshers.**

HackerEarth helps companies **test** candidates. HackerCompliment helps candidates **pass** those tests.

---

## What is HackerCompliment?

HackerCompliment is a full-stack AI interview prep platform built for college students and freshers targeting top Indian and global companies — TCS, Wipro, Infosys, Amazon, Google, Deloitte, PayPal, Intuit, GlobalLogic, Trimble, and 120+ more.

It combines real interview questions sourced from Reddit, Glassdoor, and GFG with AI-powered evaluation, voice-based mock interviews, coding practice, and resume analysis — all in one platform.

---

## Features

### 🎯 AI Interview Simulator
- Practice with **500+ real interview questions** from 120+ companies
- Never-repeat question system (tracks your history per company/role)
- Groq AI evaluates every answer with a score, detailed feedback, and improvement tips
- Supports HR, Technical, Behavioral, Coding, and System Design rounds

### 🎙️ AI Mock Interview (Voice)
- Adam (ElevenLabs) asks questions out loud — feels like a real interview
- Answer by **voice** (Deepgram speech-to-text) or typed text
- Addressed by your first name throughout ("So Mahadev, tell me about yourself...")
- Real-time filler word detection (um, uh, basically, you know, etc.)
- Adaptive follow-up questions if your score is below 7/10
- Final report with round-by-round breakdown and top 3 areas to improve

### 💻 Coding Practice
- Monaco Editor (same as VS Code) in the browser
- JDoodle code execution — supports Python, Java, C++, JavaScript
- OpenRouter DeepSeek AI evaluates your solution quality
- DSA problems sourced from real company interviews

### 📄 Resume Analyzer
- Upload your PDF resume — AI scores each section
- Fix My Resume — AI rewrites weak sections
- JD Match — paste any job description and get a match score

### 🏢 Real Question Pipeline
- Automated ingestion from Reddit (r/cscareerquestions, r/cscareerquestionsIN) and GFG RSS every 6 hours
- Groq extracts company, role, round, and question from raw experiences
- Admin review dashboard — approve to question bank, reject to delete
- User-submitted interview experiences feed the same pipeline

### 💳 Payments
- Razorpay integration (test + live mode)
- Free: 3 interview + 3 coding sessions per week
- Basic (₹99): 3 extra sessions | Standard (₹199): 8 extra | Boost (₹299): unlimited 7-day | Pro (₹599/month): unlimited

### 🔐 Authentication
- Email/password + Google OAuth
- Email verification enabled
- Protected routes with Supabase SSR middleware

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) — Mumbai region |
| Auth | Supabase Auth (Email + Google OAuth) |
| AI — Interviews | Groq API — llama-3.3-70b-versatile |
| AI — Code Eval | OpenRouter — deepseek/deepseek-r1:free |
| AI — Pipeline | Groq API — llama-3.3-70b-versatile |
| Voice — TTS | ElevenLabs (Adam voice) |
| Voice — STT | Deepgram (nova-2, en-IN) |
| Code Execution | JDoodle API |
| Payments | Razorpay |
| Code Editor | Monaco Editor |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- API keys for Groq, Razorpay, ElevenLabs, Deepgram, JDoodle, OpenRouter

### Installation

```bash
git clone https://github.com/mahadev-ambadi/HackerCompliment.git
cd HackerCompliment
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key

GROQ_API_KEY=your_groq_key

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=same_as_razorpay_key_id

OPENROUTER_API_KEY=your_openrouter_key

JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_secret

ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id

DEEPGRAM_API_KEY=your_deepgram_key

CRON_SECRET=your_cron_secret
```

> ⚠️ Never commit `.env.local` to GitHub. It is already in `.gitignore`.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── login/                      # Login (email + Google OAuth)
├── signup/                     # Signup
├── dashboard/                  # User dashboard
├── interview/                  # AI Interview Simulator
├── mock-interview/             # AI Mock Interview (voice)
├── practice/                   # Coding Practice
├── resume/                     # Resume Analyzer
├── pricing/                    # Pricing + Razorpay
├── profile/                    # User profile + history
├── history/                    # Interview history
├── share-experience/           # Submit interview experience
├── admin/
│   ├── review/                 # Review + approve questions
│   ├── problems/               # Review + publish DSA problems
│   └── analytics/              # Platform analytics
├── api/
│   ├── evaluate/               # Groq interview evaluation
│   ├── questions/              # Fetch questions (never-repeat)
│   ├── mock-questions/         # Fetch questions for mock interview
│   ├── mock-evaluate/          # Groq mock interview evaluation
│   ├── voice/speak/            # ElevenLabs TTS
│   ├── voice/transcribe/       # Deepgram STT
│   ├── execute-code/           # JDoodle code execution
│   ├── evaluate-code/          # OpenRouter code evaluation
│   ├── analyze-resume/         # Resume PDF analysis
│   ├── session-limit/          # Interview session tracker
│   ├── coding-session-limit/   # Coding session tracker
│   ├── payment/                # Razorpay order + verify
│   └── cron/                   # Automated pipelines
└── auth/callback/              # Google OAuth callback

lib/
├── supabase/                   # Supabase clients (browser, server, admin, SSR)
├── admin.ts                    # Admin whitelist
├── rateLimit.ts                # In-memory rate limiter
└── sessions.ts                 # Session helpers
```

---

## Automated Pipelines

| Pipeline | Schedule | Description |
|---|---|---|
| Ingest questions | Every 6 hrs | Reddit + GFG RSS → raw_experiences |
| Extract questions | Every 6 hrs +30m | Groq extracts questions → review queue |
| Ingest problems | Every 8 hrs | Reddit + Codeforces → raw_problems |
| Extract problems | Every 8 hrs +30m | Groq extracts DSA problems → review queue |

Trigger manually during development:
```
GET /api/cron/ingest
GET /api/cron/extract
GET /api/cron/ingest-problems
GET /api/cron/extract-problems
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Update Supabase Auth redirect URLs to your production domain
5. Add production domain to Google Cloud Console OAuth credentials
6. Verify all 4 cron jobs appear in Vercel → Settings → Cron Jobs

---

## Security

- Supabase Row Level Security (RLS) enabled on all user-facing tables
- Admin access restricted by user ID whitelist (`lib/admin.ts`)
- API routes protected with bearer token + `supabase.auth.getUser()`
- Cron endpoints protected with `x-cron-secret` header
- In-memory rate limiter: 10 requests/minute per user
- All secrets stored in `.env.local` — never committed to Git

---

## Built By

**Mahadev Ambadi SS**  
Christ University, Bengaluru  
[GitHub](https://github.com/mahadev-ambadi)

---

## License

This project is proprietary and not open for redistribution.  
© 2026 HackerCompliment. All rights reserved.
