import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const isVercelCron = request.headers.get('x-vercel-cron');
    const cronSecret = request.headers.get('x-cron-secret');
    if (!isVercelCron && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log("Starting cron extraction...");

  try {
    // 1. Fetch up to 10 pending raw experiences (batching to avoid timeouts)
    const { data: pendingItems, error: fetchError } = await supabase
      .from("raw_experiences")
      .select("id, raw_text")
      .eq("processed", false)
      .limit(10);

    if (fetchError) throw fetchError;

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ success: true, message: "No pending items to process." });
    }

    let processedCount = 0;
    let extractedQuestionsCount = 0;

    // 2. Process each item with OpenAI
    for (const item of pendingItems) {
      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are an expert tech recruiter data extractor. Your job is to read raw interview experiences and extract specific technical and behavioral questions asked.
              
              Output a JSON object with a single key "questions" containing an array of objects. Each object MUST have:
              - "company": String (e.g. "Google", "Amazon", "Startup". If not mentioned, infer or use "Unknown")
              - "role": String (e.g. "Frontend Engineer", "SDE II". If not mentioned, use "Software Engineer")
              - "round": String (e.g. "Phone Screen", "Onsite", "OA", "Technical". If unknown, use "Unknown")
              - "question": String (The exact or paraphrased question asked).
              
              If no questions are found in the text, output {"questions": []}`
            },
            {
              role: "user",
              content: item.raw_text
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        const rawJson = response.choices[0].message.content || '{"questions": []}';
        const parsed = JSON.parse(rawJson);
        const questionsArray = parsed.questions || [];

        // 3. Insert into extracted_questions and review_queue
        for (const q of questionsArray) {
          if (!q.question) continue;
          
          const company = q.company || "Unknown";
          const role = q.role || "Software Engineer";
          const round = q.round || "Unknown";
          const questionText = q.question;

          const { data: existingMatches } = await supabase
            .from("extracted_questions")
            .select("id, occurrence_count")
            .ilike("company", company)
            .ilike("question", questionText)
            .limit(1);

          if (existingMatches && existingMatches.length > 0) {
            await supabase
              .from("extracted_questions")
              .update({ occurrence_count: existingMatches[0].occurrence_count + 1 })
              .eq("id", existingMatches[0].id);
          } else {
            const { data: newQuestion, error: insertError } = await supabase
              .from("extracted_questions")
              .insert({
                raw_experience_id: item.id,
                company: company,
                role: role,
                round: round,
                question: questionText,
                occurrence_count: 1,
                status: 'pending'
              })
              .select("id")
              .single();

            if (!insertError && newQuestion) {
              await supabase.from("review_queue").insert({
                extracted_question_id: newQuestion.id
              });
            }
          }
          extractedQuestionsCount++;
        }

        // 4. Mark raw item as processed
        await supabase
          .from("raw_experiences")
          .update({ processed: true })
          .eq("id", item.id);

        processedCount++;
      } catch (err) {
        console.error("Groq error on item", item.id, err);
        // On error, we leave it as pending so it can be retried or investigated later.
      }
    }

    return NextResponse.json({ success: true, processedCount, extractedQuestionsCount });
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
