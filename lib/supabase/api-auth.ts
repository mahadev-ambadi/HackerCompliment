import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

export async function getApiUser(request: Request): Promise<User | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Route handlers cannot set cookies; middleware handles refresh.
        },
      },
    }
  );

  const {
    data: { user },
    error: cookieError,
  } = await supabase.auth.getUser();

  if (user) {
    return user;
  }

  if (cookieError) {
    console.error("Cookie auth error:", cookieError.message);
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

  const tokenClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user: tokenUser },
    error: tokenError,
  } = await tokenClient.auth.getUser(token);

  if (tokenError) {
    console.error("Token auth error:", tokenError.message);
    return null;
  }

  return tokenUser ?? null;
}
