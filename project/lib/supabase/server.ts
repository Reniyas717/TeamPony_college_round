import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import * as supabaseJs from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: Supabase server client imported in client bundle.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vcyehxsiqljhsujqazbh.supabase.co";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_deQDA2Jx4-74IWfq-pS4rQ_iRG6KJY0";
const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sb_secret_-R1l7HsEbsOOrebVg8Nxpw_N98OlPI4";

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
        }
      },
    },
  });
}

/**
 * Privileged admin client using the service/secret key.
 * Strictly used for server-side trusted operations.
 */
export function createAdminClient() {
  return supabaseJs.createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseServerClient() {
  return createAdminClient();
}
