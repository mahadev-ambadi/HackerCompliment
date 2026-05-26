import { createAdminClient } from "@/lib/supabase/admin";

export type SessionUsage = {
  sessions_used: number;
  weekStart: string;
};

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const date = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export async function getSessionUsage(userId: string): Promise<SessionUsage> {
  const weekStart = getWeekStart();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("session_usage")
    .select("sessions_used, week_start")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const storedWeek = data?.week_start
    ? String(data.week_start).split("T")[0]
    : null;

  if (!data || storedWeek !== weekStart) {
    return { sessions_used: 0, weekStart };
  }

  return {
    sessions_used: data.sessions_used ?? 0,
    weekStart,
  };
}

export async function incrementSession(userId: string): Promise<SessionUsage> {
  const weekStart = getWeekStart();
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("session_usage")
    .select("sessions_used, week_start")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const storedWeek = existing?.week_start
    ? String(existing.week_start).split("T")[0]
    : null;

  const sessionsUsed =
    existing && storedWeek === weekStart
      ? (existing.sessions_used ?? 0) + 1
      : 1;

  const { error: upsertError } = await supabase.from("session_usage").upsert(
    {
      user_id: userId,
      sessions_used: sessionsUsed,
      week_start: weekStart,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    throw upsertError;
  }

  return { sessions_used: sessionsUsed, weekStart };
}
