import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AuditService } from "@/services/audit.service";
import { ActorType, AuditOutcome } from "@/lib/validations/audit";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Resolve verified business owned by user
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (bizError) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: bizError.message } },
        { status: 500 }
      );
    }

    if (!business?.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No business workspace found for user" } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
    const action = searchParams.get("action") || undefined;
    const actorType = (searchParams.get("actor_type") as ActorType) || undefined;
    const outcome = (searchParams.get("outcome") as AuditOutcome) || undefined;
    const correlationId = searchParams.get("correlation_id") || undefined;

    const result = await AuditService.queryEvents(
      {
        business_id: business.id,
        limit,
        offset,
        action,
        actor_type: actorType,
        outcome,
        correlation_id: correlationId,
      },
      { client: supabase }
    );

    return NextResponse.json({
      data: {
        events: result.events,
        total: result.total,
        business_id: business.id,
        workspace_name: business.name,
        page: Math.floor(offset / limit) + 1,
        limit,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to retrieve audit log records",
        },
      },
      { status: 500 }
    );
  }
}
