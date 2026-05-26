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

    const { resumeText, role, company, issues, improvements } = await request.json();

    if (!resumeText || !role || !company) {
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
          content: `You are an expert resume writer specializing in Indian job market.
You rewrite weak resume content into strong, ATS-optimized bullet points.
Always be specific, use action verbs, and add metrics where possible.
Return ONLY valid JSON, no markdown, no explanation.`,
        },
        {
          role: "user",
          content: `The candidate is applying for ${role} at ${company}.

Their current resume has these issues: ${(issues || []).join(', ')}

Original resume text:
${resumeText.slice(0, 12000)}

Rewrite and fix this resume by providing:
1. A strong professional summary (2-3 lines) for ${role} at ${company}
2. Rewritten project bullet points (stronger, with metrics)
3. Skills to add for ${role} at ${company}
4. 3 specific rewritten experience/project bullets showing before and after

Return ONLY this JSON:
{
  "professionalSummary": "rewritten summary here",
  "beforeAfterBullets": [
    {
      "section": "Project/Experience name",
      "before": "original weak bullet point",
      "after": "rewritten strong bullet point with metrics"
    }
  ],
  "skillsToAdd": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "quickWins": [
    "Quick actionable tip 1",
    "Quick actionable tip 2", 
    "Quick actionable tip 3"
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
    console.error("Fix resume error:", error);
    return NextResponse.json(
      { error: "Failed to fix resume. Please try again." },
      { status: 500 }
    );
  }
}
