import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { ActivityTypeSchema } from "@/lib/validations/crm";
import { CrmService, CrmServiceError } from "@/services/crm.service";
import { NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const AddActivitySchema = z.object({
  type: ActivityTypeSchema.default("note"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  actor: z.enum(["owner", "system", "ai_agent"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function serviceErrorResponse(error: unknown, message: string) {
  if (error instanceof CrmServiceError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: null } },
      { status: error.status }
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message, details: null } },
    { status: 500 }
  );
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireOwnerContext();
    const { id } = await params;
    const activities = await CrmService.getContactActivities(id, context);
    return NextResponse.json({ data: activities }, { status: 200 });
  } catch (error) {
    return ownerContextErrorResponse(error) ?? serviceErrorResponse(error, "Failed to fetch contact activities");
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const context = await requireOwnerContext();
    const { id } = await params;
    const parsed = AddActivitySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed for activity entry",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }
    const activity = await CrmService.logActivity(
      id,
      parsed.data.type,
      parsed.data.title,
      parsed.data.description,
      "owner",
      parsed.data.metadata,
      context
    );
    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (error) {
    return ownerContextErrorResponse(error) ?? serviceErrorResponse(error, "Failed to log activity");
  }
}
