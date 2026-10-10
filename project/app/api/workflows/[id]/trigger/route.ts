import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { TriggerWorkflowInputSchema } from "@/lib/validations/workflow";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { workflowErrorResponse } from "../../_errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workflows/[id]/trigger
 * Test-fires or triggers an execution run of a workflow with custom input payload.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await requireOwnerContext();
    const json = await request.json().catch(() => ({}));
    const parsed = TriggerWorkflowInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid trigger payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const execution = await WorkflowEngineService.triggerWorkflow(context, id, parsed.data.payload);

    return NextResponse.json({ data: execution }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to execute workflow run");
  }
}
