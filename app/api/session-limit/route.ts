import { getWeekStart, incrementSession } from "@/lib/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/supabase/api-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);

    if (!user) {
      console.error("GET /api/sessions: Unauthorized — no user from cookies or token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const weekStart = getWeekStart();
    const supabase = createAdminClient();
    const FREE_LIMIT = 3;

    const { data, error } = await supabase
      .from('session_usage')
      .select('sessions_used, bonus_credits')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sessions_used = data?.sessions_used ?? 0
    const bonus_credits = data?.bonus_credits ?? 0
    const effectiveLimit = FREE_LIMIT + bonus_credits
    const remaining = Math.max(0, effectiveLimit - sessions_used)
    const canStart = sessions_used < effectiveLimit

    return NextResponse.json({
      sessions_used,
      bonus_credits,
      limit: effectiveLimit,
      remaining,
      canStart,
      weekStart,
    })
  } catch (error) {
    console.error("Session usage fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session usage." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);

    if (!user) {
      console.error("POST /api/sessions: Unauthorized — no user from cookies or token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("POST /api/sessions: Incrementing for user", user.id);

    const usage = await incrementSession(user.id);

    console.log("POST /api/sessions: Success", usage);

    return NextResponse.json(usage);
  } catch (error) {
    console.error("Session increment error:", error);
    return NextResponse.json(
      { error: "Failed to update session usage." },
      { status: 500 }
    );
  }
}
