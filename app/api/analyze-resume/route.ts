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
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    const { resumeText, targetRole, targetCompany } = await request.json();

    if (!resumeText || !targetRole || !targetCompany) {
      return NextResponse.json(
        { error: "Missing required analysis parameters." },
        { status: 400 }
      );
    }

    if (typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short to analyze." },
        { status: 400 }
      );
    }

    console.log("Extracted text preview:", resumeText?.substring(0, 200));
    console.log("Is resume check:", isLikelyResume(resumeText));

    if (!isLikelyResume(resumeText)) {
      return NextResponse.json(
        { 
          error: "Invalid document", 
          message: "The uploaded file does not appear to be a resume. Please upload your actual resume PDF." 
        }, 
        { status: 400 }
      )
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a strict ATS (Applicant Tracking System) evaluator with 10+ years experience 
screening resumes for top Indian companies like TCS, Infosys, Wipro, Amazon, Google.

You must evaluate resumes CRITICALLY and HONESTLY. Do NOT give inflated scores.

Scoring rules:
- Fresh graduate with no internship = overall max 55
- 1 project only = overall max 50
- Missing contact info = deduct 15 points
- Poor formatting = max 60 for formatting
- Missing keywords for the role = max 50 for keywords
- No quantified achievements = deduct 10 points
- Strong internship experience = can score 70-85
- Multiple projects with good descriptions = can score 65-75

You must return ONLY a valid JSON object, no markdown, no explanation:
{
  "atsScore": number 0-100 (be strict and realistic),
  "keywordsMatch": number 0-100,
  "formatting": number 0-100,
  "readability": number 0-100,
  "relevance": number 0-100,
  "rating": "Poor" | "Needs Work" | "Average" | "Good" | "Excellent",
  "summary": "2 sentence honest assessment",
  "keywordsFound": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "issues": ["specific issue 1", "specific issue 2", "specific issue 3"],
  "suggestions": ["specific fix 1", "specific fix 2", "specific fix 3"]
}

Rating scale:
0-40 = Poor
41-55 = Needs Work  
56-70 = Average
71-84 = Good
85-100 = Excellent`,
        },
        {
          role: "user",
          content: `You are evaluating a resume for the specific role of "${targetRole}" at "${targetCompany}".

IMPORTANT: Your evaluation must be SPECIFIC to this role and company.
Different roles need completely different skills and keywords.

Role-specific requirements:
- If role contains "software" or "developer" or "engineer": 
  look for programming languages, frameworks, DSA, projects, GitHub
- If role contains "data" or "analyst": 
  look for Python, SQL, Excel, statistics, ML, data visualization
- If role contains "design" or "UI" or "UX": 
  look for Figma, Adobe XD, portfolio, design tools
- If role contains "marketing" or "MBA" or "business": 
  look for communication skills, internships, leadership, certifications
- If role contains "HR" or "management": 
  look for soft skills, communication, team experience, MBA

Company-specific bar:
- Google, Amazon, Microsoft, Meta = very high bar, score 10 points lower
- TCS, Wipro, Infosys, Cognizant = moderate bar, standard scoring
- Startup = look for versatility and project ownership

RESUME TEXT:
${resumeText.slice(0, 12000)}

Count these before scoring:
1. Phone number present? (yes/no)
2. Email present? (yes/no)
3. Number of internships: (count)
4. Number of projects: (count)
5. Quantified achievements (numbers/metrics)? (yes/no)
6. Are the skills RELEVANT to ${targetRole}? (yes/no)
7. CGPA if mentioned:

Scoring based on what you found:
- 0 internships + 0-1 projects = max 45
- 0 internships + 2-3 projects = max 62
- 1 internship = max 74
- 2+ internships + quantified achievements + relevant skills = can score up to 95
- Only truly exceptional resumes (IIT + Google internship + multiple products) = 95-100
- Missing phone or email = subtract 10
- Skills not relevant to ${targetRole} = subtract 15
- No quantified achievements = subtract 8

Return ONLY this JSON, no explanation:
{
  "atsScore": number,
  "keywordsMatch": number,
  "formatting": number,
  "readability": number,
  "relevance": number,
  "rating": "Poor" | "Needs Work" | "Average" | "Good" | "Excellent",
  "summary": "2 sentence assessment mentioning ${targetRole} at ${targetCompany} specifically",
  "keywordsFound": ["only keywords relevant to ${targetRole}"],
  "missingKeywords": ["important keywords for ${targetRole} at ${targetCompany} that are missing"],
  "issues": ["specific issue 1", "specific issue 2", "specific issue 3"],
  "suggestions": ["specific fix for ${targetRole} at ${targetCompany}"]
}`,
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

    // Fix inconsistent scores
    if (analysis.keywordsScore === 0 || analysis.keywordsFound?.length === 0) {
      analysis.atsScore = Math.min(analysis.atsScore, 30);
      analysis.relevanceScore = Math.min(analysis.relevanceScore, 25);
    }

    // Overall score cannot be higher than average of all sub-scores
    const avgScore = Math.round(
      (analysis.keywordsScore + analysis.formattingScore + analysis.readabilityScore + analysis.relevanceScore) / 4
    );
    if (analysis.atsScore > avgScore + 10) {
      analysis.atsScore = avgScore;
    }

    // Fix rating to match atsScore
    if (analysis.atsScore <= 40) analysis.rating = "Poor";
    else if (analysis.atsScore <= 55) analysis.rating = "Needs Work";
    else if (analysis.atsScore <= 70) analysis.rating = "Average";
    else if (analysis.atsScore <= 84) analysis.rating = "Good";
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


