import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Validate next path to prevent open redirect vulnerabilities
  // Allow only relative URLs starting with a single '/'
  const isValidRedirect = next.startsWith("/") && !next.startsWith("//");
  const redirectTarget = isValidRedirect ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const user = data.user;
      const adminSupabase = createAdminClient();

      // Ensure profile and business are populated for OAuth users (if database trigger is pending)
      try {
        const email = user.email || "";
        const baseUsername =
          user.user_metadata?.username ||
          user.user_metadata?.full_name?.replace(/\s+/g, "_").toLowerCase() ||
          email.split("@")[0] ||
          "user";

        // Check if profile exists
        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile) {
          await adminSupabase.from("profiles").upsert(
            {
              id: user.id,
              username: baseUsername,
              email: email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        }

        // Check if business exists
        const { data: business } = await adminSupabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!business) {
          await adminSupabase.from("businesses").upsert(
            {
              owner_id: user.id,
              name: `${baseUsername}'s Workspace`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "owner_id" }
          );
        }
      } catch (profileErr) {
        console.error("Non-fatal profile setup error on OAuth callback:", profileErr);
      }

      return NextResponse.redirect(`${origin}${redirectTarget}`);
    }

    if (error) {
      console.error("OAuth code exchange error:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Return the user to login with an error message if code is missing or exchange failed
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`
  );
}
