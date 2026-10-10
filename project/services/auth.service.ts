import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SignUpInput, LoginInput } from "@/lib/validations/auth";
import { AuditService } from "./audit.service";
import { SYSTEM_BUSINESS_ID } from "@/lib/validations/audit";

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
      await AuditService.recordEvent(
        {
          business_id: SYSTEM_BUSINESS_ID,
          action: "auth.signup",
          actor: { id: "anonymous", type: "user" },
          resource: { type: "auth_user", id: "unregistered" },
          outcome: "failure",
          error: { code: "USERNAME_TAKEN", message: "This username is already taken. Please pick another one." },
          metadata: { username, email_domain: email.split("@")[1] || "" },
        },
        { critical: false, useAdminClient: true }
      );

      throw new Error("This username is already taken. Please pick another one.");
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
      const isRegistered = adminError.message.includes("already been registered");
      const errorMessage = isRegistered
        ? "An account with this email address already exists."
        : adminError.message;

      await AuditService.recordEvent(
        {
          business_id: SYSTEM_BUSINESS_ID,
          action: "auth.signup",
          actor: { id: "anonymous", type: "user" },
          resource: { type: "auth_user", id: "unregistered" },
          outcome: "failure",
          error: {
            code: isRegistered ? "EMAIL_ALREADY_REGISTERED" : "ADMIN_USER_CREATE_FAILED",
            message: errorMessage,
          },
          metadata: { username, email_domain: email.split("@")[1] || "" },
        },
        { critical: false, useAdminClient: true }
      );

      throw new Error(errorMessage);
    }

    if (!adminUserData.user) {
      throw new Error("Unable to create user account.");
    }

    const userId = adminUserData.user.id;
    const workspaceName = `${username}'s Workspace`;
    let businessId = SYSTEM_BUSINESS_ID;

    // 3. Store in profiles & businesses
    try {
      await adminSupabase.from("profiles").upsert(
        {
          id: userId,
          username: username,
          email: email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      const { data: createdBiz } = await adminSupabase
        .from("businesses")
        .upsert(
          {
            owner_id: userId,
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
          .eq("owner_id", userId)
          .maybeSingle();
        if (existingBiz?.id) {
          businessId = existingBiz.id;
        }
      }
    } catch {
      // Non-fatal
    }

    // Record business workspace creation audit event only if business was provisioned
    if (businessId !== SYSTEM_BUSINESS_ID) {
      await AuditService.recordEvent(
        {
          business_id: businessId,
          action: "business.created",
          actor: { id: userId, type: "user" },
          resource: { type: "business", id: businessId },
          outcome: "success",
          metadata: { workspace_name: workspaceName },
        },
        { critical: true, useAdminClient: true }
      );
    }

    // Record user registration audit event
    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "auth.signup",
        actor: { id: userId, type: "user" },
        resource: { type: "auth_user", id: userId },
        outcome: "success",
        metadata: { username, email_domain: email.split("@")[1] || "" },
      },
      { critical: true, useAdminClient: true }
    );

    // 4. Automatically sign the user in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: input.password,
    });

    if (signInError) {
      await AuditService.recordEvent(
        {
          business_id: businessId,
          action: "auth.failed_login",
          actor: { id: userId, type: "user" },
          resource: { type: "auth_session", id: userId },
          outcome: "failure",
          error: { code: "SIGNIN_AFTER_SIGNUP_FAILED", message: signInError.message },
          metadata: { username },
        },
        { critical: false, useAdminClient: true }
      );

      throw new Error(signInError.message);
    }

    // Record initial session login event
    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "auth.login",
        actor: { id: userId, type: "user" },
        resource: { type: "auth_session", id: userId },
        outcome: "success",
        metadata: { auth_method: "password", username },
      },
      { critical: true, client: supabase }
    );

    return {
      user: {
        id: userId,
        email: email,
        username: username,
        workspaceName: workspaceName,
      },
      session: signInData.session,
    };
  }

  /**
   * Log in user with either username or email and password.
   */
  static async logIn(input: LoginInput) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    let targetEmail = input.identifier.trim();
    let resolvedUsername = input.identifier.trim();

    // Only lookup profile if the user entered a username instead of an email
    if (!targetEmail.includes("@")) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("id, email, username")
        .ilike("username", targetEmail)
        .maybeSingle();

      if (!profile || !profile.email) {
        void AuditService.recordEvent(
          {
            business_id: SYSTEM_BUSINESS_ID,
            action: "auth.failed_login",
            actor: { id: "anonymous", type: "user" },
            resource: { type: "auth_session", id: "unauthenticated" },
            outcome: "failure",
            error: { code: "USER_NOT_FOUND", message: "Invalid username or password." },
            metadata: { identifier_type: "username" },
          },
          { critical: false, useAdminClient: true }
        ).catch(() => undefined);

        throw new Error("Invalid username or password.");
      }
      targetEmail = profile.email;
      resolvedUsername = profile.username || resolvedUsername;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: input.password,
    });

    if (authError || !authData.user) {
      void AuditService.recordEvent(
        {
          business_id: SYSTEM_BUSINESS_ID,
          action: "auth.failed_login",
          actor: { id: "anonymous", type: "user" },
          resource: { type: "auth_session", id: "unauthenticated" },
          outcome: "failure",
          error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." },
          metadata: { identifier_type: input.identifier.includes("@") ? "email" : "username" },
        },
        { critical: false, useAdminClient: true }
      ).catch(() => undefined);

      throw new Error("Invalid username or password.");
    }

    const userId = authData.user.id;
    const finalUsername = authData.user.user_metadata?.username || resolvedUsername;

    // Non-blocking audit log execution
    void AuditService.recordEvent(
      {
        business_id: SYSTEM_BUSINESS_ID,
        action: "auth.login",
        actor: { id: userId, type: "user" },
        resource: { type: "auth_session", id: userId },
        outcome: "success",
        metadata: { auth_method: "password", username: finalUsername },
      },
      { critical: false, useAdminClient: true }
    ).catch(() => undefined);

    return {
      user: {
        id: userId,
        email: authData.user.email,
        username: finalUsername,
      },
      session: authData.session,
    };
  }

  /**
   * Sign out the currently authenticated user.
   */
  static async logOut() {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    // Terminate session with local scope to ensure immediate cookie clearing
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      await supabase.auth.signOut().catch(() => undefined);
    }

    if (user) {
      void AuditService.recordEvent(
        {
          business_id: SYSTEM_BUSINESS_ID,
          action: "auth.logout",
          actor: { id: user.id, type: "user" },
          resource: { type: "auth_session", id: user.id },
          outcome: "success",
          metadata: { email_domain: user.email ? user.email.split("@")[1] : undefined },
        },
        { critical: false, useAdminClient: true }
      ).catch(() => undefined);
    }
  }

  /**
   * Get current authenticated user session and workspace info.
   */
  static async getCurrentUser() {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const extracted = AuthService.extractUserAndWorkspace(user);
    let displayName = extracted.displayName;
    let workspaceName = extracted.workspaceName;

    try {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.username) {
        displayName = profile.username;
      }

      const { data: business } = await adminSupabase
        .from("businesses")
        .select("id, name")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (business?.name && !business.name.startsWith("My's")) {
        workspaceName = business.name;
      } else {
        const isNewBusiness = !business;
        workspaceName = `${displayName}'s Workspace`;
        // Update database if it held the old "My's Workspace" or lazily provision
        const { data: updatedBiz } = await adminSupabase
          .from("businesses")
          .upsert({ owner_id: user.id, name: workspaceName }, { onConflict: "owner_id" })
          .select("id")
          .maybeSingle();

        const bizId = updatedBiz?.id || business?.id;
        if (bizId) {
          await AuditService.recordEvent(
            {
              business_id: bizId,
              action: isNewBusiness ? "business.created" : "business.updated",
              actor: { id: user.id, type: "user" },
              resource: { type: "business", id: bizId },
              outcome: "success",
              metadata: isNewBusiness
                ? { workspace_name: workspaceName, reason: "lazy_provisioning" }
                : { updated_field: "name", new_name: workspaceName, reason: "legacy_migration" },
            },
            { critical: false, useAdminClient: true }
          );
        }
      }
    } catch {
      // Fallback
    }

    return {
      id: user.id,
      email: user.email,
      username: displayName,
      workspaceName: workspaceName,
    };
  }
}
