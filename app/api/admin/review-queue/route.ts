import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiUser } from "@/lib/supabase/api-auth";
import { isAdmin } from "@/lib/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // bypasses RLS
);

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("review_queue")
    .select(`
      id,
      created_at,
      extracted_questions (
        id,
        company,
        role,
        round,
        question,
        occurrence_count
      )
    `)
    .eq("reviewed", false)
    .order("created_at", { ascending: true });

  console.log("review-queue API result:", JSON.stringify({ count: data?.length, error }, null, 2));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
