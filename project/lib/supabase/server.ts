import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-only Supabase clients.
 * Per AGENTS.md §3.1 & §5.1, these clients are strictly instantiated on the server
 * and must never be exposed to browser bundles.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  publishableKey;

if (typeof window !== "undefined") {
  throw new Error("Security Violation: Supabase server client imported in client bundle.");
}

/**
 * Standard server client scoped to request cookies (for auth & user sessions)
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in Server Component rendering
        }
      },
    },
  });
}

/**
 * Privileged admin client with secret/service key (for admin operations & migrations)
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Convenience helper for CRM and backend service layer operations
 */
export function getSupabaseServerClient() {
  if (!supabaseUrl || !secretKey) {
    return null;
  }
  return createAdminClient();
}
