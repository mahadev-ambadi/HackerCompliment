import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export type EvaluationResult = {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  wouldRecommend: boolean;
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function parseEvaluation(raw: Record<string, unknown>): EvaluationResult {
  const strengths = Array.isArray(raw.strengths)
    ? raw.strengths.filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];
  const improvements = Array.isArray(raw.improvements)
    ? raw.improvements.filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];

  return {
    overallScore: clampScore(raw.overallScore),
    technicalScore: clampScore(raw.technicalScore),
    communicationScore: clampScore(raw.communicationScore),
    problemSolvingScore: clampScore(raw.problemSolvingScore),
    confidenceScore: clampScore(raw.confidenceScore),
    strengths,
    improvements,
    detailedFeedback:
      typeof raw.detailedFeedback === "string" ? raw.detailedFeedback : "",
    wouldRecommend: Boolean(raw.wouldRecommend),
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

    const { question, answer, company, role, interviewType, experienceLevel } =
      await request.json();

    if (!question || !company || !role || !interviewType || !experienceLevel) {
      return NextResponse.json(
        { error: "Missing required evaluation parameters." },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert interviewer at ${company} evaluating a ${experienceLevel} candidate for ${role} in a ${interviewType}.

Evaluate the candidate answer strictly and fairly.

Return ONLY a valid JSON object, no markdown, no backticks, no explanation, just raw JSON:
{
  "overallScore": number 0-100,
  "technicalScore": number 0-100,
  "communicationScore": number 0-100,
  "problemSolvingScore": number 0-100,
  "confidenceScore": number 0-100,
  "strengths": ["point1", "point2", "point3"],
  "improvements": ["point1", "point2", "point3"],
  "detailedFeedback": "2-3 sentence feedback",
  "wouldRecommend": true or false
}

Scoring guide:
Poor answer = 30-50
Average answer = 50-65
Good answer = 65-80
Excellent answer = 80-95`,
        },
        {
          role: "user",
          content: `Question: ${question}

Candidate Answer: ${answer || "(No answer provided)"}

Evaluate this answer now. Return only JSON.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
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

    const evaluation = parseEvaluation(JSON.parse(cleanJson) as Record<string, unknown>);

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("Groq evaluation error:", error);
    return NextResponse.json(
      { error: "Evaluation failed. Please retry." },
      { status: 500 }
    );
  }
}
