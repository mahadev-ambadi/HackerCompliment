import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rateLimit";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

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

async function saveInterviewSession(
  userId: string,
  company: string,
  role: string,
  interviewType: string,
  experienceLevel: string,
  evaluation: EvaluationResult,
  duration: number
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase credentials not configured for session save.");
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from("interview_sessions").insert({
    user_id: userId,
    company,
    role,
    interview_type: interviewType,
    experience_level: experienceLevel,
    overall_score: evaluation.overallScore,
    technical_score: evaluation.technicalScore,
    communication_score: evaluation.communicationScore,
    problem_solving_score: evaluation.problemSolvingScore,
    confidence_score: evaluation.confidenceScore,
    strengths: evaluation.strengths,
    improvements: evaluation.improvements,
    detailed_feedback: evaluation.detailedFeedback,
    would_recommend: evaluation.wouldRecommend,
    duration_seconds: duration,
  });

  if (error) {
    console.error("Failed to save interview session:", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(user.id, 60)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const {
      question,
      answer,
      company,
      role,
      interviewType,
      experienceLevel,
      user_id,
      duration,
      saveSession,
      sessionEvaluation,
    } = body;

    if (saveSession && user_id && sessionEvaluation) {
      const evaluation = parseEvaluation(sessionEvaluation as Record<string, unknown>);
      await saveInterviewSession(
        user_id,
        company,
        role,
        interviewType,
        experienceLevel,
        evaluation,
        duration ?? 0
      );
      return NextResponse.json(evaluation);
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    if (!question || !company || !role || !interviewType || !experienceLevel) {
      return NextResponse.json(
        { error: "Missing required evaluation parameters." },
        { status: 400 }
      );
    }


    const prompt = `You are an expert interviewer at ${company} evaluating a ${experienceLevel} candidate for ${role} in a ${interviewType}.

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
Excellent answer = 80-95

Question: ${question}
Candidate Answer: ${answer || "(No answer provided)"}

Evaluate this answer now. Return ONLY JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "";

    if (!responseText) {
      return NextResponse.json(
        { error: "No response received from Groq." },
        { status: 502 }
      );
    }

    let cleanJson = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      if (process.env.NODE_ENV === "development") {
        console.error("JSON parsing failed. Retrying after aggressive cleanup...");
      }
      
      try {
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJson = jsonMatch[0];
          parsedData = JSON.parse(cleanJson);
        } else {
          throw new Error("No JSON object found in response");
        }
      } catch (retryError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Second parse attempt failed:", responseText);
        }
        return NextResponse.json({
          overallScore: 0,
          technicalScore: 0,
          communicationScore: 0,
          problemSolvingScore: 0,
          confidenceScore: 0,
          strengths: [],
          improvements: ["AI Evaluation Failed"],
          detailedFeedback: "We could not process your answer properly. Please try again.",
          wouldRecommend: false
        });
      }
    }

    const evaluation = parseEvaluation(parsedData);

    if (saveSession && user_id) {
      await saveInterviewSession(
        user_id,
        company,
        role,
        interviewType,
        experienceLevel,
        evaluation,
        duration ?? 0
      );
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Groq evaluation error:", error);
    }
    return NextResponse.json({
      overallScore: 0,
      technicalScore: 0,
      communicationScore: 0,
      problemSolvingScore: 0,
      confidenceScore: 0,
      strengths: [],
      improvements: ["AI Evaluation Failed"],
      detailedFeedback: "An unexpected error occurred during AI evaluation.",
      wouldRecommend: false
    });
  }
}
