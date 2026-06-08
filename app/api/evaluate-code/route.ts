import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { code, language, problem, output, runtime } = await request.json();

    if (!code || !language || !problem) {
      return NextResponse.json(
        { error: "Missing required fields (code, language, problem)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an expert coding interviewer. Evaluate this student's solution.

Problem: ${problem.title || "Unknown"} (Difficulty: ${problem.difficulty || "Unknown"}, Company: ${problem.company || "Unknown"})
Language: ${language}
Code: ${code}
Output: ${output}
Runtime: ${runtime}ms

Return ONLY a raw JSON object with no markdown:
{
  "score": number (0-100),
  "time_complexity": "O(?)",
  "space_complexity": "O(?)",
  "correctness": "Correct" | "Partially Correct" | "Incorrect",
  "strengths": ["..."],
  "improvements": ["..."],
  "optimized_approach": "brief description",
  "feedback": "2-3 sentence educational feedback"
}`;

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

    let parsedResult = null;
    
    try {
      // Groq with json_object format guarantees JSON output
      let cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJson);
      
      console.log("Parsed evaluation:", parsedResult);
    } catch (parseError) {
      console.error("Failed to parse evaluation response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI evaluation" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedResult);

  } catch (error) {
    console.error("Unexpected error in evaluate-code API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during evaluation." },
      { status: 500 }
    );
  }
}
