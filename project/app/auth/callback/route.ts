import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AuditService } from "@/services/audit.service";
import { SYSTEM_BUSINESS_ID } from "@/lib/validations/audit";

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
      let businessId = SYSTEM_BUSINESS_ID;

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
          const workspaceName = `${baseUsername}'s Workspace`;
          const { data: createdBiz } = await adminSupabase
            .from("businesses")
            .upsert(
              {
                owner_id: user.id,
                name: workspaceName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "owner_id" }
            )
            .select("id")
            .maybeSingle();

          if (createdBiz?.id) {
            businessId = createdBiz.id;
          } else {
            const { data: existingBiz } = await adminSupabase
              .from("businesses")
              .select("id")
              .eq("owner_id", user.id)
              .maybeSingle();
            if (existingBiz?.id) {
              businessId = existingBiz.id;
            }
          }

          if (businessId !== SYSTEM_BUSINESS_ID) {
            await AuditService.recordEvent(
              {
                business_id: businessId,
                action: "business.created",
                actor: { id: user.id, type: "user" },
                resource: { type: "business", id: businessId },
                outcome: "success",
                metadata: { workspace_name: workspaceName, auth_provider: "oauth" },
              },
              { critical: true, useAdminClient: true }
            );
          }
        } else {
          businessId = business.id;
        }
      } catch (profileErr) {
        console.error("Non-fatal profile setup error on OAuth callback:", profileErr);
      }

      // Record successful OAuth login audit event
      await AuditService.recordEvent(
        {
          business_id: businessId,
          action: "auth.login",
          actor: { id: user.id, type: "user" },
          resource: { type: "auth_session", id: user.id },
          outcome: "success",
          metadata: { auth_method: "oauth" },
        },
        { critical: true, client: supabase }
      );

      return NextResponse.redirect(`${origin}${redirectTarget}`);
    }

    if (error) {
      console.error("OAuth code exchange error:", error.message);

      await AuditService.recordEvent(
        {
          business_id: SYSTEM_BUSINESS_ID,
          action: "auth.failed_login",
          actor: { id: "anonymous", type: "user" },
          resource: { type: "auth_session", id: "oauth" },
          outcome: "failure",
          error: { code: "OAUTH_EXCHANGE_ERROR", message: error.message },
          metadata: { auth_method: "oauth" },
        },
        { critical: false, useAdminClient: true }
      );

      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Record failed login audit event if code is missing or exchange failed
  await AuditService.recordEvent(
    {
      business_id: SYSTEM_BUSINESS_ID,
      action: "auth.failed_login",
      actor: { id: "anonymous", type: "user" },
      resource: { type: "auth_session", id: "oauth" },
      outcome: "failure",
      error: { code: "MISSING_OAUTH_CODE", message: "Missing authorization code" },
      metadata: { auth_method: "oauth" },
    },
    { critical: false, useAdminClient: true }
  );

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`
  );
}
