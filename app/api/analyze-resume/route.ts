import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export type ResumeAnalysisResult = {
  atsScore: number;
  keywordsScore: number;
  formattingScore: number;
  readabilityScore: number;
  relevanceScore: number;
  keywordsFound: string[];
  missingKeywords: string[];
  issuesFound: string[];
  suggestions: string[];
  verdict: string;
  rating?: string;
  sectionScores?: Record<string, number>;
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function isLikelyResume(text: string): boolean {
  const lowerText = text.toLowerCase()
  
  // Must have personal contact indicators
  const hasContact = (
    lowerText.includes('email') || 
    lowerText.includes('@gmail') || 
    lowerText.includes('@yahoo') ||
    lowerText.includes('@outlook') ||
    /\+?\d{10,}/.test(text) // phone number
  )
  
  // Must have education section
  const hasEducation = (
    lowerText.includes('b.tech') ||
    lowerText.includes('b.e.') ||
    lowerText.includes('bachelor') ||
    lowerText.includes('master') ||
    lowerText.includes('bsc') ||
    lowerText.includes('msc') ||
    lowerText.includes('cgpa') ||
    lowerText.includes('gpa') ||
    lowerText.includes('10th') ||
    lowerText.includes('12th')
  )
  
  // Must have experience or projects section
  const hasExperience = (
    lowerText.includes('work experience') ||
    lowerText.includes('internship') ||
    lowerText.includes('project') ||
    lowerText.includes('responsibilities') ||
    lowerText.includes('achievements')
  )
  
  // Red flags — project/product documents
  const isProductDoc = (
    lowerText.includes('how to use this document') ||
    lowerText.includes('tech stack') ||
    lowerText.includes('file structure') ||
    lowerText.includes('environment variables') ||
    lowerText.includes('api routes') ||
    lowerText.includes('next task') ||
    lowerText.includes('mvp')
  )
  
  if (isProductDoc) return false
  
  return hasContact && hasEducation && hasExperience
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseAnalysis(raw: Record<string, unknown>): ResumeAnalysisResult {
  return {
    atsScore: clampScore(raw.atsScore),
    keywordsScore: clampScore(raw.keywordsScore ?? raw.keywordsMatch),
    formattingScore: clampScore(raw.formattingScore ?? raw.formatting),
    readabilityScore: clampScore(raw.readabilityScore ?? raw.readability),
    relevanceScore: clampScore(raw.relevanceScore ?? raw.relevance),
    keywordsFound: parseStringArray(raw.keywordsFound),
    missingKeywords: parseStringArray(raw.missingKeywords),
    issuesFound: parseStringArray(raw.issuesFound ?? raw.issues),
    suggestions: parseStringArray(raw.suggestions),
    verdict: typeof raw.verdict === "string" ? raw.verdict : (typeof raw.summary === "string" ? raw.summary : ""),
    sectionScores: typeof raw.sectionScores === "object" ? (raw.sectionScores as Record<string, number>) : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let extractedText = '';
    let targetRole = 'Software Engineer';
    let targetCompany = 'TCS';
    let skipValidation = false;

    if (contentType.includes('application/json')) {
      // Re-analyze flow — text already extracted and validated before
      const body = await request.json();
      extractedText = body.resumeText;
      targetRole = body.targetRole || body.role || targetRole;
      targetCompany = body.targetCompany || body.company || targetCompany;
      skipValidation = true; // Skip isLikelyResume check
      console.log("Re-analyze text preview:", extractedText?.substring(0, 300));
    } else {
      // File upload flow — existing FormData logic (fallback)
      const body = await request.json().catch(() => ({}));
      extractedText = body.resumeText || "";
      targetRole = body.targetRole || targetRole;
      targetCompany = body.targetCompany || targetCompany;
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    if (!extractedText || !targetRole || !targetCompany) {
      return NextResponse.json(
        { error: "Missing required analysis parameters." },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({ 
        error: "Resume text too short or empty" 
      }, { status: 400 })
    }

    if (!skipValidation) {
      console.log("Extracted text preview:", extractedText?.substring(0, 200));
      console.log("Is resume check:", isLikelyResume(extractedText));

      if (!isLikelyResume(extractedText)) {
        return NextResponse.json(
          { 
            error: "Invalid document", 
            message: "The uploaded file does not appear to be a resume. Please upload your actual resume PDF." 
          }, 
          { status: 400 }
        );
      }
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a brutally honest ATS scanner and resume expert. 
You MUST give different scores every time based on actual content.
NEVER round to 80, 82, or 85. Be precise — use scores like 67, 73, 44, 91.
You evaluate 6 specific sections of a resume.`
        },
        {
          role: "user",
          content: `Evaluate this resume for ${targetRole} at ${targetCompany}.

RESUME TEXT:
${extractedText.slice(0, 12000)}

STEP 1 - Audit each section (answer honestly):

CONTACT SECTION:
- Has phone number? (yes/no)
- Has email? (yes/no)
- Has LinkedIn? (yes/no)
- Has GitHub/Portfolio? (yes/no) — important for tech roles
- Has location/city? (yes/no)
Contact score: 20 points max. Each missing item = -4 points.

PROFESSIONAL SUMMARY:
- Has a summary/objective? (yes/no)
- Is it role-specific for ${targetRole}? (yes/no)
- Is it 2-4 lines? (yes/no)
Summary score: 15 points max. Missing = 0. Generic = 5. Role-specific = 15.

SKILLS:
- Lists relevant technical skills for ${targetRole}? (yes/no)
- Has 5+ skills? (yes/no)
- Skills match ${targetCompany} requirements? (yes/no)
- Has soft skills? (yes/no)
Skills score: 20 points max.

WORK HISTORY / EXPERIENCE:
- Has internships? (count: 0/1/2+)
- Has work experience? (yes/no)
- Uses action verbs? (yes/no)
- Has quantified achievements with numbers/metrics? (yes/no)
- Experience relevant to ${targetRole}? (yes/no)
Work score: 25 points max. 0 internships = max 10. 1 = max 18. 2+ = max 25.

EDUCATION:
- Has degree listed? (yes/no)
- Has CGPA/GPA? (yes/no)
- CGPA above 7.5? (yes/no)
- Has certifications? (yes/no)
- Has relevant coursework? (yes/no)
Education score: 10 points max.

FORMATTING & READABILITY:
- Clear section headers? (yes/no)
- Consistent formatting? (yes/no)
- Appropriate length (1-2 pages)? (yes/no)
- No spelling errors apparent? (yes/no)
Formatting score: 10 points max.

STEP 2 - Calculate:
atsScore = Contact + Summary + Skills + Work + Education + Formatting
(This must be the SUM of all section scores — do NOT inflate it)

Company difficulty adjustment:
- Google, Amazon, Microsoft, Meta, Apple: subtract 8
- Flipkart, Swiggy, Zomato, Paytm: subtract 4
- TCS, Wipro, Infosys, Cognizant, HCL: no adjustment
- Deloitte, Accenture, Capgemini: subtract 2

STEP 3 - Return ONLY this JSON (no markdown):
{
  "atsScore": calculated sum above (integer, NOT rounded to 80/82/85),
  "sectionScores": {
    "contact": number out of 20,
    "professionalSummary": number out of 15,
    "skills": number out of 20,
    "workHistory": number out of 25,
    "education": number out of 10,
    "formatting": number out of 10
  },
  "keywordsMatch": number 0-100,
  "formatting": number 0-100,
  "readability": number 0-100,
  "relevance": number 0-100,
  "rating": "Poor" | "Needs Work" | "Average" | "Good" | "Excellent",
  "summary": "2 sentence specific assessment mentioning actual gaps found",
  "keywordsFound": ["only keywords actually present in the resume text"],
  "missingKeywords": ["important keywords for ${targetRole} at ${targetCompany} missing from resume"],
  "issues": [
    "specific issue found in contact section",
    "specific issue found in experience section", 
    "specific issue found in skills section"
  ],
  "suggestions": [
    "specific actionable fix 1",
    "specific actionable fix 2",
    "specific actionable fix 3"
  ]
}`
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    if (!responseText) {
      return NextResponse.json(
        { error: "No response received from Groq." },
        { status: 502 }
      );
    }

    const cleanJson = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const analysis = parseAnalysis(JSON.parse(cleanJson) as Record<string, unknown>);

    const s = analysis.sectionScores;
    if (s) {
      const realScore = (s.contact || 0) + (s.professionalSummary || 0) + 
        (s.skills || 0) + (s.workHistory || 0) + 
        (s.education || 0) + (s.formatting || 0);
      // Use the lower of AI score or calculated score
      analysis.atsScore = Math.min(analysis.atsScore, realScore);
    }

    // Rating recalculation
    if (analysis.atsScore <= 35) analysis.rating = "Poor";
    else if (analysis.atsScore <= 50) analysis.rating = "Needs Work";
    else if (analysis.atsScore <= 65) analysis.rating = "Average";
    else if (analysis.atsScore <= 79) analysis.rating = "Good";
    else analysis.rating = "Excellent";

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json(
      { error: "Resume analysis failed. Please retry." },
      { status: 500 }
    );
  }
}


