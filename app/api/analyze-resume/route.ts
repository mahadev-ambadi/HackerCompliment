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
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseAnalysis(raw: Record<string, unknown>): ResumeAnalysisResult {
  return {
    atsScore: clampScore(raw.atsScore),
    keywordsScore: clampScore(raw.keywordsScore),
    formattingScore: clampScore(raw.formattingScore),
    readabilityScore: clampScore(raw.readabilityScore),
    relevanceScore: clampScore(raw.relevanceScore),
    keywordsFound: parseStringArray(raw.keywordsFound),
    missingKeywords: parseStringArray(raw.missingKeywords),
    issuesFound: parseStringArray(raw.issuesFound),
    suggestions: parseStringArray(raw.suggestions),
    verdict: typeof raw.verdict === "string" ? raw.verdict : "",
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

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS system and resume consultant. Analyze this resume for a ${targetRole} position at ${targetCompany}.

Return ONLY raw JSON, no markdown, no backticks:
{
  "atsScore": number 0-100,
  "keywordsScore": number 0-100,
  "formattingScore": number 0-100,
  "readabilityScore": number 0-100,
  "relevanceScore": number 0-100,
  "keywordsFound": array of strings,
  "missingKeywords": array of strings,
  "issuesFound": array of strings,
  "suggestions": array of strings,
  "verdict": string one sentence summary
}

Be specific to the role and company.
Missing keywords should be real important keywords for that role.
Issues should be real resume problems.
Suggestions should be actionable.`,
        },
        {
          role: "user",
          content: `Resume content: ${resumeText.slice(0, 12000)}

Target Role: ${targetRole}
Target Company: ${targetCompany}
Analyze this resume now.`,
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
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json(
      { error: "Resume analysis failed. Please retry." },
      { status: 500 }
    );
  }
}
