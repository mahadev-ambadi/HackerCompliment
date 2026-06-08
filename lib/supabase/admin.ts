import { createClient } from "@supabase/supabase-js";

// Bypass corporate proxy SSL MITM blocking Node.js database connections
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
