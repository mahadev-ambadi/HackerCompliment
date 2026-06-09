// Force turbopack recompile
import { getWeekStart } from "@/lib/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/supabase/api-auth";
import { isAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);

    if (!user) {
      console.error("GET /api/coding-sessions: Unauthorized — no user from cookies or token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await canStartCoding(user);
    const FREE_LIMIT = 3;

    return NextResponse.json({
      sessions_used: status.sessions_used,
      bonus_credits: status.bonus_credits,
      limit: FREE_LIMIT + status.bonus_credits,
      remaining: status.remainingSessions,
      canStart: status.allowed,
      hasPlan: status.hasPlan,
      planName: status.planName,
      isUnlimitedPlan: status.isUnlimitedPlan,
      unlimitedLabel: status.unlimitedLabel,
      planDate: status.planDate,
      weekStart: getWeekStart(),
    });
  } catch (error) {
    console.error("Coding session usage fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coding session usage." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);

    if (!user) {
      console.error("POST /api/coding-sessions: Unauthorized — no user from cookies or token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await canStartCoding(user);

    if (!status.allowed) {
      console.warn(`User ${user.id} reached coding session limit. Blocking increment.`);
      return NextResponse.json({ success: false, limitReached: true });
    }

    if (process.env.NODE_ENV === "development") {
      console.log("POST /api/coding-sessions: Incrementing for user", user.id);
    }

    const usage = await incrementCodingSession(user.id);

    return NextResponse.json({ success: true, ...usage });
  } catch (error) {
    console.error("Coding session increment error:", error);
    return NextResponse.json(
      { error: "Failed to update coding session usage." },
      { status: 500 }
    );
  }
}

async function incrementCodingSession(userId: string) {
  const supabase = createAdminClient();

  const weekStartStr = getWeekStart();

  const { data: existing } = await supabase
    .from('coding_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .maybeSingle();

  let sessionsUsed = 1;

  if (existing) {
    sessionsUsed = existing.sessions_used + 1;
    await supabase
      .from('coding_sessions')
      .update({ 
        sessions_used: sessionsUsed, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('week_start', weekStartStr);
  } else {
    await supabase
      .from('coding_sessions')
      .insert({ 
        user_id: userId, 
        week_start: weekStartStr, 
        sessions_used: 1, 
        bonus_credits: 0 
      });
  }

  return { sessions_used: sessionsUsed, weekStart: weekStartStr };
}

async function canStartCoding(user: any) {
  const userId = user.id;
  const weekStart = getWeekStart();
  const supabase = createAdminClient();
  const FREE_LIMIT = 3;

  // 1. Check if user has active paid plan
  const { data: purchaseData } = await supabase
    .from('purchases')
    .select('status, plan, created_at')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .in('status', ['active', 'completed', 'Completed'])
    .order('created_at', { ascending: false })
    .limit(1);
  const activePurchase = purchaseData && purchaseData.length > 0 ? purchaseData[0] : null;
  const planName = activePurchase ? activePurchase.plan.toLowerCase() : 'free';

  // 2. Fetch session usage & bonus credits from coding_sessions table
  const { data: usageData } = await supabase
    .from('coding_sessions')
    .select('sessions_used, bonus_credits')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  const sessions_used = usageData?.sessions_used ?? 0;
  const bonus_credits = usageData?.bonus_credits ?? 0;
  
  const planDate = activePurchase ? activePurchase.created_at : null;

  let isUnlimitedPlan = isAdmin(userId);
  let unlimitedLabel = "Unlimited Access";

  if (!isUnlimitedPlan && planDate) {
    const daysSincePurchase = (new Date().getTime() - new Date(planDate).getTime()) / (1000 * 3600 * 24);
    if (planName === 'boost' && daysSincePurchase <= 7) {
      isUnlimitedPlan = true;
      unlimitedLabel = "Unlimited access (7 days)";
    } else if (planName === 'pro' && daysSincePurchase <= 30) {
      isUnlimitedPlan = true;
      unlimitedLabel = "Unlimited access (30 days)";
    }
  }

  if (isUnlimitedPlan) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] User ${userId} has unlimited access. Label: ${unlimitedLabel}`);
    }
    return {
      allowed: true,
      reason: unlimitedLabel,
      hasPlan: true, 
      remainingSessions: Number.POSITIVE_INFINITY,
      sessions_used,
      bonus_credits,
      planName,
      isUnlimitedPlan: true,
      unlimitedLabel,
      planDate
    };
  }

  const effectiveLimit = FREE_LIMIT + bonus_credits;
  const remainingSessions = Math.max(0, effectiveLimit - sessions_used);
  
  if (bonus_credits > 0 && remainingSessions > 0) {
    return {
      allowed: true,
      reason: "Bonus credits available",
      hasPlan: false,
      remainingSessions,
      sessions_used,
      bonus_credits,
      planName,
      isUnlimitedPlan: false,
      unlimitedLabel: null,
      planDate
    };
  }

  if (sessions_used < effectiveLimit) {
    return {
      allowed: true,
      reason: "Free sessions available",
      hasPlan: false,
      remainingSessions,
      sessions_used,
      bonus_credits,
      planName,
      isUnlimitedPlan: false,
      unlimitedLabel: null,
      planDate
    };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] User ${userId} blocked from coding. Used: ${sessions_used}, Limit: ${effectiveLimit}`);
  }

  return {
    allowed: false,
    reason: "Limit reached",
    hasPlan: false,
    remainingSessions: 0,
    sessions_used,
    bonus_credits,
    planName,
    isUnlimitedPlan: false,
    unlimitedLabel: null,
    planDate
  };
}
