import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rating, message, name } = body;

    const { error } = await supabase
      .from('feedback')
      .insert([
        { rating, message, name }
      ]);

    if (error) {
      console.error('Supabase error inserting feedback:', error);
      return NextResponse.json({ error: 'Failed to insert feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Feedback route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
