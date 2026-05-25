import { getSessionUsage, incrementSession } from "@/lib/sessions";
import { getApiUser } from "@/lib/supabase/api-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);

    if (!user) {
      console.error("GET /api/sessions: Unauthorized — no user from cookies or token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getSessionUsage(user.id);
    return NextResponse.json(usage);
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
