import { NextResponse } from "next/server";
import { AuditQueryFiltersSchema } from "@/lib/validations/audit";
import { OwnerContextError, requireOwnerContext } from "@/lib/supabase/owner-context";
import { AuditService } from "@/services/audit.service";

export async function GET(request: Request) {
  try {
    const context = await requireOwnerContext();
    const params = new URL(request.url).searchParams;
    const parsed = AuditQueryFiltersSchema.safeParse({
      business_id: context.businessId,
      limit: params.has("limit") ? Number(params.get("limit")) : undefined,
      offset: params.has("offset") ? Number(params.get("offset")) : undefined,
      action: params.get("action") ?? undefined,
      actor_id: params.get("actor_id") ?? undefined,
      actor_type: params.get("actor_type") ?? undefined,
      resource_type: params.get("resource_type") ?? undefined,
      resource_id: params.get("resource_id") ?? undefined,
      outcome: params.get("outcome") ?? undefined,
      correlation_id: params.get("correlation_id") ?? undefined,
      workflow_id: params.get("workflow_id") ?? undefined,
      from_timestamp: params.get("from_timestamp") ?? undefined,
      to_timestamp: params.get("to_timestamp") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid audit filters", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const [result, businessResult] = await Promise.all([
      AuditService.queryEvents(parsed.data, { client: context.client }),
      context.client.from("businesses").select("name").eq("id", context.businessId).maybeSingle(),
    ]);
    if (businessResult.error) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Could not load audit records." } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        events: result.events,
        total: result.total,
        business_id: context.businessId,
        workspace_name: businessResult.data?.name ?? "Workspace",
        page: Math.floor(parsed.data.offset / parsed.data.limit) + 1,
        limit: parsed.data.limit,
      },
    });
  } catch (error) {
    if (error instanceof OwnerContextError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: null } },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not load audit records.", details: null } },
      { status: 500 }
    );
  }
}
