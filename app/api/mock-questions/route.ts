import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function POST(req: Request) {
  try {
    const { company, role, interview_type, limit = 5 } = await req.json();

    if (!interview_type) {
      return NextResponse.json(
        { error: "interview_type is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Primary Query: exact match for company, role, and interview_type
    // Note: Supabase JS client doesn't support ORDER BY random() directly without RPC.
    // We fetch a larger pool (e.g., 50) and shuffle in code to simulate RANDOM() LIMIT.
    const { data: primaryData, error: primaryError } = await supabase
      .from("question_bank")
      .select("id, question, company, role, interview_type, difficulty")
      .ilike("company", `%${company}%`)
      .ilike("role", `%${role}%`)
      .eq("interview_type", interview_type)
      .eq("use_in_mock", true)
      .limit(50);

    if (primaryError) {
      console.error("Primary query error:", primaryError);
      return NextResponse.json(
        { error: "Failed to fetch primary questions" },
        { status: 500 }
      );
    }

    let questions = shuffleArray(primaryData || []).slice(0, limit);

    // Dynamic replacement of original company name with requested company name 
    // in case the matched question was originally for a different company
    if (company) {
      questions = questions.map(q => {
        let modifiedQuestion = q.question;
        if (q.company && q.company.toLowerCase() !== company.toLowerCase()) {
          const regex = new RegExp(`\\b${q.company}\\b`, "gi");
          modifiedQuestion = q.question.replace(regex, company);
        }
        return {
          ...q,
          question: modifiedQuestion,
          company: company // override the company field
        };
      });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error in mock-questions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
