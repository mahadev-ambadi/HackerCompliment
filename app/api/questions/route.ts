import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    const role = searchParams.get("role");
    const interviewType = searchParams.get("interviewType");
    const userId = searchParams.get("userId");
    const count = parseInt(searchParams.get("count") || "5", 10);

    if (!company || !role || !interviewType || !userId) {
      return NextResponse.json(
        { error: "Missing required query parameters" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase credentials are not configured" },
        { status: 500 }
      );
    }

    // Use service role key to bypass RLS for backend operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all question IDs user has already seen
    const { data: historyData, error: historyError } = await supabase
      .from("user_question_history")
      .select("question_id")
      .eq("user_id", userId);

    if (historyError) {
      console.error("Error fetching history:", historyError);
      return NextResponse.json({ error: "Failed to fetch question history" }, { status: 500 });
    }

    const seenIds = historyData.map((h) => h.question_id);

    // 2. Fetch unseen questions for this company+role+type
    let query = supabase
      .from("question_bank")
      .select("*")
      .eq("company", company)
      .eq("role", role)
      .eq("interview_type", interviewType);

    const { data: availableQuestions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching questions:", fetchError);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    // Filter out seen questions
    let unseenQuestions = availableQuestions.filter((q) => !seenIds.includes(q.id));
    let resetOccurred = false;

    // 3. If unseen questions < count (user has seen all), reset history
    if (unseenQuestions.length < count && availableQuestions.length > 0) {
      const allIdsForCriteria = availableQuestions.map((q) => q.id);

      // Delete their history for these specific questions
      if (allIdsForCriteria.length > 0) {
        await supabase
          .from("user_question_history")
          .delete()
          .eq("user_id", userId)
          .in("question_id", allIdsForCriteria);
      }

      // Reset local state to fetch fresh questions
      unseenQuestions = [...availableQuestions];
      resetOccurred = true;
    }

    // Shuffle unseen questions to act as ORDER BY RANDOM()
    for (let i = unseenQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unseenQuestions[i], unseenQuestions[j]] = [unseenQuestions[j], unseenQuestions[i]];
    }

    // Limit to the requested count
    const selectedQuestions = unseenQuestions.slice(0, count);

    // 4. Save these question IDs to user_question_history
    if (selectedQuestions.length > 0) {
      const insertPayload = selectedQuestions.map((q) => ({
        user_id: userId,
        question_id: q.id,
      }));

      const { error: insertError } = await supabase
        .from("user_question_history")
        .insert(insertPayload);

      if (insertError) {
        console.error("Error inserting history:", insertError);
        // We don't fail the request here, just log it
      }
    }

    // 5. Return payload
    return NextResponse.json({
      questions: selectedQuestions,
      total: selectedQuestions.length,
      resetOccurred,
    });
  } catch (error) {
    console.error("Unexpected error in /api/questions:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
