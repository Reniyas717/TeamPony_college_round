import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a server-scoped Supabase client that respects RLS and uses cookies for auth.
 * For use in API route handlers and Server Components.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createServerClient(supabaseUrl, supabasePublishableKey, {
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  return createServerClient(supabaseUrl, supabaseSecretKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
