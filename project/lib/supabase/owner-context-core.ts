import type { SupabaseClient, User } from "@supabase/supabase-js";

export class OwnerContextError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 404 | 503,
    public readonly code: "UNAUTHORIZED" | "BUSINESS_NOT_FOUND" | "BUSINESS_CONTEXT_UNAVAILABLE"
  ) {
    super(message);
    this.name = "OwnerContextError";
  }
}

export interface OwnerContext {
  client: SupabaseClient;
  user: User;
  businessId: string;
}

export function ownerContextErrorResponse(error: unknown): Response | null {
  if (!(error instanceof OwnerContextError)) return null;

  return Response.json(
    { error: { code: error.code, message: error.message, details: null } },
    { status: error.status }
  );
}

export async function resolveOwnerContext(client: SupabaseClient): Promise<OwnerContext> {
  const { data, error: authError } = await client.auth.getUser();
  if (authError || !data.user) {
    throw new OwnerContextError("Sign in to continue.", 401, "UNAUTHORIZED");
  }

  const { data: business, error: businessError } = await client
    .from("businesses")
    .select("id")
    .eq("owner_id", data.user.id)
    .maybeSingle();

  if (businessError) {
    throw new OwnerContextError("Business data is temporarily unavailable.", 503, "BUSINESS_CONTEXT_UNAVAILABLE");
  }
  if (!business?.id) {
    throw new OwnerContextError("No business is associated with this account.", 404, "BUSINESS_NOT_FOUND");
  }

  return { client, user: data.user, businessId: business.id };
}
