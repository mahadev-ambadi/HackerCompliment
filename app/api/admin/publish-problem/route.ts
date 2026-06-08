import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getApiUser } from '@/lib/supabase/api-auth';
import { isAdmin } from '@/lib/admin';

export async function POST(request: Request) {
  try {
    // 1. Verify user is admin using isAdmin
    const user = await getApiUser(request);
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Accept Payload
    const body = await request.json();
    const { 
      id: extractedId, // From spreading the problem object
      title, 
      company, 
      difficulty, 
      description, 
      examples, 
      constraints, 
      tags, 
      test_cases_json, 
      starter_code 
    } = body;

    if (!extractedId || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Parse test cases safely with try/catch
    let parsedTestCases = [];
    try {
      if (test_cases_json) {
        parsedTestCases = JSON.parse(test_cases_json);
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON format for Test Cases' }, { status: 400 });
    }

    // Note: starter_code from page.tsx template is a raw Python string, not JSON.
    // If it happens to be valid JSON, we could parse it, but for now we'll treat it as a string 
    // as instructed by the "python: starter_code" structure.
    let pythonStarter = starter_code || '';
    try {
      // Just in case they submitted a JSON object stringified instead of raw code
      const parsed = JSON.parse(starter_code);
      if (typeof parsed === 'string') {
        pythonStarter = parsed;
      }
    } catch(e) {
      // It's just raw python code
    }

    // Initialize Supabase Admin Client (Service Role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Insert into problems table
    const { error: insertError } = await supabase
      .from('problems')
      .insert({
        title,
        difficulty,
        company: company || 'Unknown',
        description,
        examples,
        constraints,
        tags: Array.isArray(tags) ? tags : [],
        test_cases: parsedTestCases,
        starter_code: { 
          python: pythonStarter, 
          java: "class Solution {\n    public void solve() {\n        // Write solution\n    }\n}", 
          cpp: "class Solution {\npublic:\n    void solve() {\n        // Write solution\n    }\n};" 
        }
      });

    if (insertError) {
      console.error("Failed to insert into problems table:", insertError);
      return NextResponse.json({ error: insertError.message || 'Failed to publish problem' }, { status: 500 });
    }

    // 5. Update raw_problems_extracted set status='published'
    const { error: updateError } = await supabase
      .from('raw_problems_extracted')
      .update({ status: 'published' })
      .eq('id', extractedId);

    if (updateError) {
      console.error("Failed to update status on raw_problems_extracted:", updateError);
      // We still published the problem successfully, so we won't return 500, but we log it.
    }

    // 6. Return success
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Publish problem error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
