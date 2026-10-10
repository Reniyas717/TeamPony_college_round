import { NextResponse } from "next/server";
import { CrmService } from "@/services/crm.service";
import { z } from "zod";

/**
 * /api/crm/contacts/[id]/activities
 * Handles retrieval of contact activity timeline and manual note logging.
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

const AddActivitySchema = z.object({
  type: z.enum(["form_submission", "stage_change", "note", "email_sent", "ai_agent_action"]).default("note"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  actor: z.enum(["owner", "system", "ai_agent"]).default("owner"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const activities = await CrmService.getContactActivities(id);
    return NextResponse.json({ data: activities }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch contact activities",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const json = await request.json().catch(() => null);

    const parsed = AddActivitySchema.safeParse(json);
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
      parsed.data.actor,
      parsed.data.metadata
    );

    return NextResponse.json({ data: activity }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to log activity",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
