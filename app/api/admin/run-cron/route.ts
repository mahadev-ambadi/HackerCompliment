import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/supabase/api-auth';
import { isAdmin } from '@/lib/admin';

export async function POST(request: Request) {
  try {
    // 1. Verify user is admin
    const user = await getApiUser(request);
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Accept Payload
    const body = await request.json();
    const { type } = body;

    const validTypes = ['ingest', 'extract', 'ingest-problems', 'extract-problems'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid cron type' }, { status: 400 });
    }

    const cronSecret = process.env.CRON_SECRET || '';
    
    // Construct the absolute URL to call the local cron API
    const baseUrl = new URL(request.url).origin;
    const url = `${baseUrl}/api/cron/${type}`;

    console.log(`[Admin] Triggering cron manually: ${url}`);

    // 3. Call the appropriate cron route internally with secrets
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-cron-secret': cronSecret,
        'authorization': `Bearer ${cronSecret}`
      }
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error(`[Admin] Cron ${type} failed with status ${res.status}:`, data);
      return NextResponse.json({ error: data.error || 'Cron execution failed' }, { status: res.status });
    }

    // 4. Return result
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Run cron error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
