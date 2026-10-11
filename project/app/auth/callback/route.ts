import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { AuditService } from "@/services/audit.service";
import {
  getGoogleConnectionStatus,
  storeGoogleTokensFromLogin,
} from "@/services/webinar/google-token-vault.service";


async function recordOAuthFailure(reasonCode: string) {
  try {
    await AuditService.recordPlatformSecurityEvent(
      "auth.failed_login",
      { type: "auth_session", id: "oauth" },
      { method: "oauth", reason_code: reasonCode },
    );
  } catch {
    console.error(`[AUTH-AUDIT-UNAVAILABLE] action=auth.failed_login reason=${reasonCode}`);
  }
}

function redirectToLogin(origin: string, message = "Authentication failed. Please try again.") {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const redirectTarget = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    await recordOAuthFailure("MISSING_OAUTH_CODE");
    return redirectToLogin(origin);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    await recordOAuthFailure("OAUTH_EXCHANGE_FAILED");
    return redirectToLogin(origin);
  }

  try {
      const user = data.user;
      const adminSupabase = createAdminClient();

      const email = user.email || "";
      const baseUsername =
        user.user_metadata?.username ||
        user.user_metadata?.full_name?.replace(/\s+/g, "_").toLowerCase() ||
        email.split("@")[0] ||
        "user";
      const { data: profile, error: profileLookupError } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileLookupError) throw new Error("PROFILE_LOOKUP_FAILED");
      if (!profile) {
        const { error: profileError } = await adminSupabase.from("profiles").upsert(
          {
            id: user.id,
            username: baseUsername,
            email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (profileError) throw new Error("PROFILE_PROVISIONING_FAILED");
      }

      const { data: existingBusiness, error: businessLookupError } = await adminSupabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (businessLookupError) throw new Error("BUSINESS_LOOKUP_FAILED");

      let businessId = existingBusiness?.id;
      if (!businessId) {
        const { data: createdBusiness, error: businessError } = await adminSupabase
          .from("businesses")
          .upsert(
            {
              owner_id: user.id,
              name: `${baseUsername}'s Workspace`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "owner_id" },
          )
          .select("id")
          .maybeSingle();
        if (businessError || !createdBusiness?.id) throw new Error("BUSINESS_PROVISIONING_FAILED");
        businessId = createdBusiness.id;
      }

      const isGoogle =
        user.app_metadata?.provider === "google" ||
        user.identities?.some((identity) => identity.provider === "google");
      let googleEvent: "google.connected" | "google.reconnected" | "google.credentials_replaced" | null = null;
      let wasConnected = false;
      let googleScopes: string[] = [];
      if (isGoogle && data.session?.provider_token && businessId) {
        try {
          const previous = await getGoogleConnectionStatus(businessId);
          wasConnected = previous.connected && previous.scope_granted;
        } catch {
          // The existing vault service reports configuration/reconnect requirements.
        }

        try {
          const storedGoogleGrant = await storeGoogleTokensFromLogin(user.id, data.session);
          googleScopes = storedGoogleGrant?.scopes ?? [];
          googleEvent = wasConnected
            ? data.session.provider_refresh_token
              ? "google.credentials_replaced"
              : "google.reconnected"
            : "google.connected";
        } catch {
          // Preserve authentication when the optional Meet token vault is unavailable.
          console.error("[GOOGLE-TOKEN-VAULT] unavailable during OAuth callback");
        }
      }

      if (data.session?.provider_token || data.session?.provider_refresh_token) {
        const { error: sanitizedSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sanitizedSessionError) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
          await recordOAuthFailure("SESSION_SANITIZATION_FAILED");
          return redirectToLogin(origin);
        }
      }

      const context = await requireOwnerContext();
      if (!existingBusiness) {
        await AuditService.recordBusinessEvent(context, {
          action: "business.created",
          resource: { type: "business", id: context.businessId },
          outcome: "success",
          metadata: { business_name: `${baseUsername}'s Workspace`, provisioning_source: "google_oauth" },
        });
      }
      await AuditService.recordBusinessEvent(context, {
        action: "auth.login",
        resource: { type: "auth_session", id: context.user.id },
        outcome: "success",
        metadata: { provider: "google" },
      });
      if (googleEvent) {
        await AuditService.recordBusinessEvent(context, {
          action: googleEvent,
          resource: { type: "google_connection", id: context.businessId },
          outcome: "success",
          metadata: { provider: "google", scopes: googleScopes },
        });
      }

      return NextResponse.redirect(`${origin}${redirectTarget}`);
  } catch {
    await recordOAuthFailure("OAUTH_ACCOUNT_SETUP_FAILED");
    return redirectToLogin(origin);
  }
}
