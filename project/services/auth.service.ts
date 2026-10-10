import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SignUpInput, LoginInput } from "@/lib/validations/auth";

export class AuthService {
  /**
   * Register a new user with username, email, and password.
   * Uses admin.createUser to bypass email confirmation restrictions on Supabase.
   */
  static async signUp(input: SignUpInput) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();

    // 1. Check if username is already taken in user profiles
    const { data: existingUser } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      throw new Error("This username is already taken. Please pick another one.");
    }

    // 2. Create confirmed user directly via Admin API (prevents fake email rejection / confirmation barriers)
    const { data: adminUserData, error: adminError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        username: username,
      },
    });

    if (adminError) {
      // If user already registered in Supabase auth
      if (adminError.message.includes("already been registered")) {
        throw new Error("An account with this email address already exists.");
      }
      throw new Error(adminError.message);
    }

    if (!adminUserData.user) {
      throw new Error("Unable to create user account.");
    }

    const userId = adminUserData.user.id;

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
          name: `${username}'s Workspace`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" }
      );
    } catch {
      // Non-fatal if schema tables are creating
    }

    // 4. Automatically sign the user in so cookies/session are set immediately
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

    let targetEmail = input.identifier.trim().toLowerCase();

    // If identifier is not an email address, look up email associated with username
    if (!targetEmail.includes("@")) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("email")
        .eq("username", targetEmail)
        .maybeSingle();

      if (!profile || !profile.email) {
        throw new Error("Invalid username or password.");
      }
      targetEmail = profile.email;
    }

    // Sign in with password via Supabase Auth
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
        username: authData.user.user_metadata?.username || input.identifier,
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
   * Get current authenticated user session.
   */
  static async getCurrentUser() {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.email?.split("@")[0] || "User",
    };
  }
}
