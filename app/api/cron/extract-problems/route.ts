import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET(request: Request) {
  try {
    // 1. Verify CRON_SECRET header (skip in development)
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch up to 5 rows from raw_problems where processed=false
    const { data: rawProblems, error: fetchError } = await supabase
      .from('raw_problems')
      .select('id, raw_text')
      .eq('processed', false)
      .limit(5);

    if (fetchError || !rawProblems || rawProblems.length === 0) {
      return NextResponse.json({ success: true, processed: 0, extracted: 0, skipped: 0, message: "No unprocessed problems found" });
    }

    let processedCount = 0;
    let extractedCount = 0;
    let skippedCount = 0;

    const SYSTEM_PROMPT = `You are a competitive programming expert. Extract DSA problem details from the given text.
Return ONLY valid JSON in exactly this format:
{
  "title": "Problem name (short, titlecase)",
  "company": "Company name if mentioned, else infer from context, else Unknown",
  "difficulty": "Easy or Medium or Hard",
  "description": "Clear problem statement in 2-4 sentences",
  "examples": "Input/output examples as a string",
  "constraints": "Constraints as a string",
  "tags": ["tag1", "tag2"],
  "is_valid_problem": true or false
}
Valid tags are ONLY from this list: Arrays, Strings, Trees, Graphs, DP, HashTable, TwoPointers, BinarySearch, Stack, Queue, LinkedList, Greedy, Sorting, Math, Design.
If you cannot extract a valid problem, return { "is_valid_problem": false }`;

    for (const problem of rawProblems) {
      try {
        // 3. Call Groq API
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: problem.raw_text || "" }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          response_format: { type: "json_object" },
        });

        const responseText = completion.choices[0]?.message?.content || "";
        
        if (!responseText) {
          throw new Error("Empty Groq response");
        }

        // 4. Parse the JSON response
        let cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const extracted = JSON.parse(cleanJson);

        // 5. If is_valid_problem is false, skip
        if (!extracted.is_valid_problem) {
          skippedCount++;
        } else {
          // 6. If valid, check if title already exists using ilike
          const { data: existing } = await supabase
            .from('raw_problems_extracted')
            .select('id')
            .ilike('title', extracted.title || '')
            .maybeSingle();

          if (existing) {
            skippedCount++;
          } else {
            // Insert into raw_problems_extracted
            const { error: insertError } = await supabase
              .from('raw_problems_extracted')
              .insert({
                raw_problem_id: problem.id,
                title: extracted.title || 'Unknown',
                company: extracted.company || 'Unknown',
                difficulty: extracted.difficulty || 'Medium',
                description: extracted.description || '',
                examples: extracted.examples || '',
                constraints: extracted.constraints || '',
                tags: Array.isArray(extracted.tags) ? extracted.tags : [],
              });

            if (!insertError) {
              extractedCount++;
            } else {
              skippedCount++;
              console.error("Failed to insert extracted problem", insertError);
            }
          }
        }

        // 7. Mark raw_problem processed=true
        await supabase
          .from('raw_problems')
          .update({ processed: true })
          .eq('id', problem.id);
          
        processedCount++;
        
      } catch (err) {
        console.error(`Failed to process raw_problem ${problem.id}:`, err);
        // We do not mark as processed if there was a critical failure calling the AI,
        // so it can be retried on the next cron run.
      }
    }

    // 8. Return results
    return NextResponse.json({ 
      success: true, 
      processed: processedCount, 
      extracted: extractedCount, 
      skipped: skippedCount 
    });
    
  } catch (error) {
    console.error('Cron extract error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
