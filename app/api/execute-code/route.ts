import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rateLimit";

const JDOODLE_API_URL = "https://api.jdoodle.com/v1/execute";

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(user.id, 60)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { code, language } = await request.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: "Missing required fields (code, language)" },
        { status: 400 }
      );
    }

    const clientId = process.env.JDOODLE_CLIENT_ID;
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("JDoodle credentials missing");
      return NextResponse.json(
        { error: "Execution service is not configured properly." },
        { status: 500 }
      );
    }

    // Map languages and versions for JDoodle
    let mappedLanguage = "";
    let versionIndex = "0";

    const normalizedLang = language.toLowerCase();
    
    if (normalizedLang === "python") {
      mappedLanguage = "python3";
      versionIndex = "3";
    } else if (normalizedLang === "java") {
      mappedLanguage = "java";
      versionIndex = "4";
    } else if (normalizedLang === "cpp" || normalizedLang === "c++") {
      mappedLanguage = "cpp17";
      versionIndex = "0";
    } else if (normalizedLang === "javascript") {
      mappedLanguage = "nodejs";
      versionIndex = "4";
    } else {
      // Fallback
      mappedLanguage = normalizedLang;
      versionIndex = "0";
    }

    const jdoodlePayload = {
      clientId,
      clientSecret,
      script: code,
      language: mappedLanguage,
      versionIndex,
    };

    const response = await fetch(JDOODLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jdoodlePayload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("JDoodle API error:", data);
      return NextResponse.json(
        { 
          output: data.error || data.message || "Failed to execute code", 
          runtime: "0",
          memory: "0",
          status: "error" 
        },
        { status: response.ok ? 400 : response.status }
      );
    }

    // JDoodle standard response includes output, cpuTime, memory, statusCode
    const isError = data.statusCode !== 200 || !data.output;

    return NextResponse.json({
      output: (data.output || "").trim(),
      runtime: data.cpuTime || "0",
      memory: data.memory || "0",
      status: isError ? "error" : "success",
    });

  } catch (error) {
    console.error("Unexpected error in execute-code API:", error);
    return NextResponse.json(
      { 
        output: "An unexpected error occurred during execution.", 
        runtime: "0", 
        memory: "0",
        status: "error" 
      },
      { status: 500 }
    );
  }
}
