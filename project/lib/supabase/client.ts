import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser-scoped Supabase client for client-side interactions (e.g. OAuth sign-in).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
