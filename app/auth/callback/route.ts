import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  
  console.log("Auth callback hit. Code present:", !!code);

  if (code) {
    // Initialize the response early so cookies can be attached to it
    const supabaseResponse = NextResponse.redirect(new URL("/dashboard", request.url));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // This successfully sets the cookie on supabaseResponse
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log("exchangeCodeForSession data:", data);
    console.log("exchangeCodeForSession error:", error);
    console.log("cookies being returned:", supabaseResponse.cookies.getAll());
    
    if (error) {
      console.error("Auth callback exchange error:", error);
    } else {
      console.log("Auth callback exchange successful, redirecting to /dashboard");
    }
    
    console.log("Redirect target:", "/dashboard");
    return supabaseResponse;
  }

  console.warn("Auth callback received no code, redirecting to /login");
  return NextResponse.redirect(new URL("/login", request.url));
}
