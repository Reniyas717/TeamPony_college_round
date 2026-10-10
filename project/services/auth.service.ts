import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SignUpInput, LoginInput } from "@/lib/validations/auth";

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
      if (adminError.message.includes("already been registered")) {
        throw new Error("An account with this email address already exists.");
      }
      throw new Error(adminError.message);
    }

    if (!adminUserData.user) {
      throw new Error("Unable to create user account.");
    }

    const userId = adminUserData.user.id;
    const workspaceName = `${username}'s Workspace`;

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

      await adminSupabase.from("businesses").upsert(
        {
          owner_id: userId,
          name: workspaceName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" }
      );
    } catch {
      // Non-fatal
    }

    // 4. Automatically sign the user in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: input.password,
    });

    if (signInError) {
      throw new Error(signInError.message);
    }

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

    if (!targetEmail.includes("@")) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("email, username")
        .ilike("username", targetEmail)
        .maybeSingle();

      if (!profile || !profile.email) {
        throw new Error("Invalid username or password.");
      }
      targetEmail = profile.email;
      resolvedUsername = profile.username || resolvedUsername;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: input.password,
    });

    if (authError) {
      throw new Error("Invalid username or password.");
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: authData.user.user_metadata?.username || resolvedUsername,
      },
      session: authData.session,
    };
  }

  /**
   * Sign out the currently authenticated user.
   */
  static async logOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
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
        .select("name")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (business?.name && !business.name.startsWith("My's")) {
        workspaceName = business.name;
      } else {
        workspaceName = `${displayName}'s Workspace`;
        // Update database if it held the old "My's Workspace"
        await adminSupabase
          .from("businesses")
          .upsert({ owner_id: user.id, name: workspaceName }, { onConflict: "owner_id" });
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
