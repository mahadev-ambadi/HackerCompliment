import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .lt('rating', 0) // Only approved feedbacks
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 });
    }

    return NextResponse.json({ feedbacks: data });
  } catch (err) {
    console.error('Feedback route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
