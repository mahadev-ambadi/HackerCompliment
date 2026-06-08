import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase credentials are not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || !isAdmin(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { company, role, rawContent, sourcePlatform, sourceUrl } = await request.json();

    if (!company || !role || !rawContent) {
      return NextResponse.json(
        { error: "Missing required fields (company, role, rawContent)" },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: groqApiKey });

    const prompt = `Extract ONLY genuine interview questions explicitly mentioned in this interview experience. Do NOT invent questions. Preserve original wording. Ignore explanations, answers, and prep tips. For each question return: { question: string, interview_type: 'Technical'|'HR'|'Behavioral', difficulty: 'Easy'|'Medium'|'Hard', tags: string[] }. Return ONLY a raw JSON array, no markdown, no backticks.

Interview Experience:
"""
${rawContent}
"""`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const responseText = completion.choices[0]?.message?.content || "";
    console.log('Groq raw response:', responseText);

    let extractedQuestions: any[] = [];
    
    try {
      const startIndex = responseText.indexOf('[');
      const endIndex = responseText.lastIndexOf(']');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("No JSON array found in response");
      }
      
      const jsonStr = responseText.substring(startIndex, endIndex + 1);
      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed)) {
        extractedQuestions = parsed;
        console.log('Parsed questions:', extractedQuestions);
      } else {
        throw new Error("Parsed JSON is not an array");
      }
    } catch (e) {
      console.error("Failed to parse Groq response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse questions from AI response" },
        { status: 500 }
      );
    }

    if (extractedQuestions.length === 0) {
      return NextResponse.json({
        inserted: 0,
        skipped: 0,
        questions: []
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const insertedQuestions = [];

    for (const item of extractedQuestions) {
      if (!item.question) continue;
      
      const qText = item.question.trim();

      const { data: existing } = await supabase
        .from('question_bank')
        .select('id')
        .eq('company', company)
        .eq('role', role)
        .ilike('question', qText)
        .single();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Insert new question
      const insertPayload = {
        company,
        role,
        question: qText,
        interview_type: item.interview_type || "Technical",
        difficulty: item.difficulty || "Medium",
        tags: item.tags || []
      };

      const { error: insertError } = await supabase
        .from("question_bank")
        .insert(insertPayload);

      if (insertError) {
        console.error("Error inserting question:", insertError);
      } else {
        insertedCount++;
        insertedQuestions.push(insertPayload);
      }
    }

    return NextResponse.json({
      inserted: insertedCount,
      skipped: skippedCount,
      questions: insertedQuestions
    });

  } catch (error) {
    console.error("Unexpected error in extract-questions API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
