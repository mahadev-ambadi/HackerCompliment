import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    const { resumeText, jdText } = await request.json();

    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "Missing required parameters." },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS system and recruitment specialist with 15 years experience.
You analyze how well a resume matches a specific job description.
Be strict, honest and specific. Return ONLY valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: `Compare this resume against this job description and give a detailed match analysis.

JOB DESCRIPTION:
${jdText.slice(0, 10000)}

RESUME:
${resumeText.slice(0, 10000)}

Analyze these specifically:
1. What required skills from JD are present in resume?
2. What required skills from JD are MISSING in resume?
3. What experience level does JD require vs what candidate has?
4. Are the qualifications sufficient?
5. Would this resume pass ATS for this specific JD?

Return ONLY this JSON:
{
  "matchScore": 85,
  "atsWillPass": true,
  "matchRating": "Strong Match",
  "summary": "2-3 sentence honest assessment of fit",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "matchedRequirements": ["requirement met 1", "requirement met 2"],
  "missingRequirements": ["requirement missing 1", "requirement missing 2"],
  "experienceMatch": "Perfect Match",
  "topRecommendations": [
    "Specific thing to add/fix to improve match score",
    "Specific thing to add/fix to improve match score",
    "Specific thing to add/fix to improve match score"
  ]
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

    return NextResponse.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error("Match JD error:", error);
    return NextResponse.json(
      { error: "Failed to analyze JD match. Please try again." },
      { status: 500 }
    );
  }
}
