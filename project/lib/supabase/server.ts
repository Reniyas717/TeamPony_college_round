import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: Supabase server client imported in client bundle.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

/**
 * Creates a server-scoped Supabase client that respects RLS and uses cookies for auth.
 * For use in API route handlers and Server Components.
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
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Privileged admin client using the service/secret key.
 * Strictly used for server-side trusted operations (e.g. creating initial businesses/profiles if needed).
 * NEVER exposed to the client.
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
 * Convenience helper for CRM and backend service layer operations.
 * Returns null if Supabase environment variables are not configured,
 * enabling seamless local in-memory fallback.
 */
export function getSupabaseServerClient() {
  if (!supabaseUrl || !secretKey) {
    return null;
  }
  return createAdminClient();
}
