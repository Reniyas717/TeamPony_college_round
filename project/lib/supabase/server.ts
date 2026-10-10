import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for database operations.
 * Per AGENTS.md §3.1 & §5.1, this client is strictly instantiated on the server
 * and must never be exposed to browser bundles.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Prefer server secret key (service role) for backend route/service operations, fallback to anon/publishable key
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: Supabase server client imported in client bundle.");
}

export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
