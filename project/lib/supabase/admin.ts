import { createClient, SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: Supabase admin client imported in client bundle.");
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vcyehxsiqljhsujqazbh.supabase.co";
const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sb_secret_-R1l7HsEbsOOrebVg8Nxpw_N98OlPI4";

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!cachedAdmin) {
    cachedAdmin = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedAdmin;
}
