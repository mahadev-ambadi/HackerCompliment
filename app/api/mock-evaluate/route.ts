import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      question,
      answer,
      candidateName,
      company,
      role,
      interview_type,
      questionNumber,
      totalQuestions,
    } = body;

    if (!question || !answer || !candidateName || !company || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("GROQ_API_KEY is missing in environment variables.");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an experienced interviewer at ${company} interviewing ${candidateName} for a ${role} position. Be professional but conversational. Address the candidate as ${candidateName}.`;

    const userPrompt = `
Evaluate the following answer provided by ${candidateName} for the question:
Question: "${question}"
Answer: "${answer}"

Provide a JSON object containing the following keys:
1. "score": a number from 1 to 10 evaluating the quality of the answer.
2. "feedback": a string of 2-3 sentences of constructive feedback. Address the candidate by their first name.
3. "followUp": a string containing one follow-up question if the score is less than 7, otherwise an empty string. Address the candidate by their first name.
4. "fillerWords": an array of unique filler words/phrases detected in the answer. Check for these specifically:
   - Basic: um, uh, er, ah, hmm
   - Word fillers: like, so, well, right, okay, basically, actually, literally, honestly, clearly, obviously, definitely, absolutely, certainly, exactly, totally, really, just, kind of, sort of, you know, I mean
   - Phrase fillers: you know what I mean, if that makes sense, at the end of the day, to be honest, to be fair, as I said, like I said, and stuff, and things, or whatever, or something like that, in terms of, the thing is, I guess, I suppose, I feel like
   - Indian English specific: only (at end of sentence), isn't it, na, means (mid-sentence)
   Only include the ones that were actually used by the candidate.
5. "fillerCount": the TOTAL count of ALL occurrences of the detected filler words/phrases (not just the number of unique words). For example, if they said "um" 5 times, that adds 5 to the count.

You must respond ONLY with valid JSON. Do not use markdown blocks, do not wrap the response in backticks, and do not include any other text.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2, // Low temperature for more consistent JSON formatting
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to evaluate answer using Groq" },
        { status: 500 }
      );
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || "{}";

    // Fallback: Strip backticks if the model accidentally includes them despite instructions
    if (content.startsWith("```")) {
      content = content.replace(/^```(json)?/, "").replace(/```$/, "").trim();
    }

    let parsedEvaluation;
    try {
      parsedEvaluation = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse Groq evaluation JSON:", content);
      return NextResponse.json(
        { error: "Invalid JSON received from evaluator" },
        { status: 500 }
      );
    }

    // Ensure all required fields exist in the parsed object
    const finalEvaluation = {
      score: typeof parsedEvaluation.score === "number" ? parsedEvaluation.score : 5,
      feedback: typeof parsedEvaluation.feedback === "string" ? parsedEvaluation.feedback : "Thank you for your answer.",
      followUp: typeof parsedEvaluation.followUp === "string" ? parsedEvaluation.followUp : "",
      fillerWords: Array.isArray(parsedEvaluation.fillerWords) ? parsedEvaluation.fillerWords : [],
      fillerCount: typeof parsedEvaluation.fillerCount === "number" ? parsedEvaluation.fillerCount : 0,
    };

    return NextResponse.json(finalEvaluation);
  } catch (error) {
    console.error("Error in mock-evaluate API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
