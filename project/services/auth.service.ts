import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { SignUpInput, LoginInput } from "@/lib/validations/auth";
import { AuditService } from "./audit.service";

const GOOGLE_MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
type PlatformAuthAction = "auth.signup" | "auth.failed_login";

async function recordPlatformAuthEvent(
  action: PlatformAuthAction,
  reasonCode: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await AuditService.recordPlatformSecurityEvent(
      action,
      { type: "auth_session", id: "unauthenticated" },
      { ...metadata, reason_code: reasonCode },
    );
  } catch {
    console.error(`[AUTH-AUDIT-UNAVAILABLE] action=${action} reason=${reasonCode}`);
  }
}

function genericAuthError(message: string) {
  return message.toLowerCase().includes("already")
    ? "An account with those details already exists."
    : "Unable to complete authentication.";
}

export class AuthService {
  /**
   * Formats a user display name and workspace name from user metadata or email.
   */
  static extractUserAndWorkspace(user: {
    email?: string;
    user_metadata?: {
      username?: string;
      full_name?: string;
      name?: string;
    };
  }) {
    // 1. Explicit username
    if (user.user_metadata?.username) {
      const name = user.user_metadata.username;
      return {
        displayName: name,
        workspaceName: `${name}'s Workspace`,
      };
    }

    // 2. Google Full Name / Name
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
    if (fullName) {
      const formattedName = fullName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      return {
        displayName: formattedName,
        workspaceName: `${formattedName}'s Workspace`,
      };
    }

    // 3. Email Prefix fallback (e.g. "reniyasnadar717" -> "Reniyas Nadar")
    if (user.email) {
      const prefix = user.email.split("@")[0];
      const cleaned = prefix.replace(/[0-9_.-]+/g, " ").trim();
      const displayName = cleaned
        ? cleaned
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")
        : prefix;

      return {
        displayName: displayName || prefix,
        workspaceName: `${displayName || prefix}'s Workspace`,
      };
    }

    return {
      displayName: "Creator",
      workspaceName: "My Workspace",
    };
  }

  /**
   * Register a new user with username, email, and password.
   */
  static async signUp(input: SignUpInput) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();

    // 1. Check if username is already taken
    const { data: existingUser } = await adminSupabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (existingUser) {
      await recordPlatformAuthEvent("auth.signup", "USERNAME_TAKEN");
      throw new Error("An account with that username already exists.");
    }

    // 2. Create confirmed user directly via Admin API
    const { data: adminUserData, error: adminError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        username: username,
        full_name: username,
      },
    });

    if (adminError) {
      await recordPlatformAuthEvent("auth.signup", "ACCOUNT_PROVISIONING_FAILED");
      throw new Error(genericAuthError(adminError.message));
    }

    if (!adminUserData.user) {
      throw new Error("Unable to create user account.");
    }

    const userId = adminUserData.user.id;
    const workspaceName = `${username}'s Workspace`;
    const { error: profileError } = await adminSupabase.from("profiles").upsert(
      {
        id: userId,
        username,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error("Unable to provision the account profile.");

    const { data: existingBusiness, error: existingBusinessError } = await adminSupabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existingBusinessError) throw new Error("Unable to provision the workspace.");

    const { data: business, error: businessError } = await adminSupabase
      .from("businesses")
      .upsert(
        {
          owner_id: userId,
          name: workspaceName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" },
      )
      .select("id")
      .maybeSingle();
    if (businessError || !business?.id) throw new Error("Unable to provision the workspace.");

    // 4. Automatically sign the user in, then audit only with verified context.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: input.password,
    });

    if (signInError || !signInData.user) {
      await recordPlatformAuthEvent("auth.failed_login", "SIGNIN_AFTER_SIGNUP_FAILED");
      throw new Error("Account created, but sign-in could not be completed.");
    }

    const context = await requireOwnerContext();
    if (!existingBusiness) {
      await AuditService.recordBusinessEvent(context, {
        action: "business.created",
        resource: { type: "business", id: context.businessId },
        outcome: "success",
        metadata: { business_name: workspaceName, provisioning_source: "password_signup" },
      });
    }
    await AuditService.recordBusinessEvent(context, {
      action: "auth.signup",
      resource: { type: "auth_user", id: context.user.id },
      outcome: "success",
      metadata: { method: "password" },
    });
    await AuditService.recordBusinessEvent(context, {
      action: "auth.login",
      resource: { type: "auth_session", id: context.user.id },
      outcome: "success",
      metadata: { method: "password" },
    });

    return {
      user: {
        id: context.user.id,
        email: context.user.email,
        username,
        workspaceName,
      },
      session: signInData.session,
    };
  }

  /** Logs in with the existing email credential flow. */
  static async logIn(input: LoginInput) {
    const supabase = await createClient();

    let targetEmail = input.identifier.trim().toLowerCase();
    const identifierType: "email" | "username" = targetEmail.includes("@") ? "email" : "username";

    // Only lookup profile if the user entered a username instead of an email
    if (identifierType === "username") {
      const admin = createAdminClient();
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("email")
        .ilike("username", targetEmail)
        .maybeSingle();
      if (profileError || !profile?.email) {
        await recordPlatformAuthEvent("auth.failed_login", "INVALID_CREDENTIALS", {
          identifier_type: identifierType,
        });
        throw new Error("Invalid username or password.");
      }
      targetEmail = String(profile.email).toLowerCase();
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: input.password,
    });

    if (authError || !authData.user) {
      await recordPlatformAuthEvent("auth.failed_login", "INVALID_CREDENTIALS", {
        identifier_type: identifierType,
      });
      throw new Error("Invalid username or password.");
    }

    const context = await requireOwnerContext();
    await AuditService.recordBusinessEvent(context, {
      action: "auth.login",
      resource: { type: "auth_session", id: context.user.id },
      outcome: "success",
      metadata: { method: "password" },
    });

    return {
      user: {
        id: context.user.id,
        email: context.user.email,
        username: context.user.user_metadata?.username || input.identifier.trim(),
      },
      session: authData.session,
    };
  }

  /**
   * Sign out the currently authenticated user.
   */
  static async logOut() {
    const supabase = await createClient();
    const context = await requireOwnerContext();
    const { error } = await supabase.auth.signOut();
    if (error) {
      await AuditService.recordBusinessEvent(context, {
        action: "auth.logout",
        resource: { type: "auth_session", id: context.user.id },
        outcome: "failure",
        error: { code: "SIGNOUT_FAILED", message: "Sign out failed." },
      });
      throw new Error("Could not sign out.");
    }

    await AuditService.recordBusinessEvent(context, {
      action: "auth.logout",
      resource: { type: "auth_session", id: context.user.id },
      outcome: "success",
    });
  }

  /**
   * Get current authenticated user session and workspace info.
   */
  static async getCurrentUser() {
    try {
      const context = await requireOwnerContext();
      const { data: profile } = await context.client
        .from("profiles")
        .select("username")
        .eq("id", context.user.id)
        .maybeSingle();
      const extracted = AuthService.extractUserAndWorkspace(context.user);
      const { data: business } = await context.client
        .from("businesses")
        .select("name")
        .eq("id", context.businessId)
        .maybeSingle();
      return {
        id: context.user.id,
        email: context.user.email,
        username: profile?.username || extracted.displayName,
        workspaceName: business?.name || extracted.workspaceName,
      };
    } catch {
      return null;
    }
  }

  static readonly googleMeetScope = GOOGLE_MEET_SCOPE;
}
