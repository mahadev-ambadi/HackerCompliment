import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const cronSecret = request.headers.get("x-cron-secret");
    if (!isVercelCron && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("=== Starting extraction ===");

  try {
    const { data: pendingItems, error: fetchError } = await supabase
      .from("raw_experiences")
      .select("id, raw_text")
      .eq("processed", false)
      .limit(10);

    if (fetchError) throw fetchError;
    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ success: true, message: "No pending items." });
    }

    console.log(`Processing ${pendingItems.length} items`);

    let processedCount = 0;
    let extractedQuestionsCount = 0;

    for (const item of pendingItems) {
      try {
        console.log(`Item ${item.id} text preview: "${item.raw_text.substring(0, 120)}"`);

        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are an interview question extractor for an Indian tech interview prep platform.

Read the given text and extract ALL interview questions that were asked. Be generous — include:
- Explicit questions ("They asked me: explain recursion")  
- Implicit questions (someone saying "I was asked about binary trees" → extract "Explain binary trees")
- OA/coding round problems described
- HR/behavioral questions ("tell me about yourself", "why this company")
- System design topics asked ("design a URL shortener")
- Any topic someone says was "asked", "discussed", or "tested on"

For each question output:
- "company": company name (guess from context if not explicit, else "Unknown")
- "role": job role (guess from context if not explicit, else "Software Engineer")  
- "round": one of "HR", "Technical", "Coding", "System Design", "OA", "Behavioral", "Unknown"
- "question": a clear, standalone question sentence

If a post mentions "I had interviews at Google and Amazon" with no questions → output {"questions": []}
If a post has any hint of what was asked → extract it.

Output ONLY valid JSON: {"questions": [{"company":"...","role":"...","round":"...","question":"..."}]}`
            },
            {
              role: "user",
              content: item.raw_text.substring(0, 4000), // cap to avoid token limits
            },
          ],
        });

        const rawJson = response.choices[0].message.content || '{"questions":[]}';
        console.log(`Item ${item.id} Groq response: ${rawJson.substring(0, 200)}`);

        let questionsArray: any[] = [];
        try {
          const parsed = JSON.parse(rawJson);
          questionsArray = parsed.questions || [];
        } catch (parseErr) {
          console.error(`Item ${item.id}: JSON parse failed`, rawJson.substring(0, 100));
        }

        console.log(`Item ${item.id}: extracted ${questionsArray.length} questions`);

        for (const q of questionsArray) {
          if (!q.question || q.question.length < 10) continue;

          const company = (q.company || "Unknown").trim();
          const role = (q.role || "Software Engineer").trim();
          const round = (q.round || "Unknown").trim();
          const questionText = q.question.trim();

          // Check for duplicate
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
                company,
                role,
                round,
                question: questionText,
                occurrence_count: 1,
                status: "pending",
              })
              .select("id")
              .single();

            if (!insertError && newQuestion) {
              await supabase.from("review_queue").insert({
                extracted_question_id: newQuestion.id,
              });
              extractedQuestionsCount++;
            }
          }
        }

        // Mark processed regardless of question count
        await supabase
          .from("raw_experiences")
          .update({ processed: true })
          .eq("id", item.id);

        processedCount++;
      } catch (err) {
        console.error(`Groq error on item ${item.id}:`, err);
      }
    }

    console.log(`=== Extraction done: processed=${processedCount}, questions=${extractedQuestionsCount} ===`);
    return NextResponse.json({ success: true, processedCount, extractedQuestionsCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}