import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { company, role, interviewType } = await request.json();

    if (!company || !role || !interviewType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert technical interviewer. You must return your response in JSON format. The JSON object must contain exactly one key "questions" mapping to an array of 20 string questions. Example: { "questions": ["Question 1", "Question 2"] }`,
        },
        {
          role: "user",
          content: `Generate 20 unique ${interviewType} interview questions for ${role} at ${company}. Focus on real questions asked at this company. Return as a JSON array of strings only.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content || "{}";
    
    let parsed: { questions?: string[] } = {};
    try {
      parsed = JSON.parse(responseContent);
    } catch (e) {
      console.error("Failed to parse JSON from Groq:", responseContent);
    }

    const questions = parsed.questions && Array.isArray(parsed.questions) 
      ? parsed.questions 
      : [];

    return NextResponse.json({ questions });

  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
