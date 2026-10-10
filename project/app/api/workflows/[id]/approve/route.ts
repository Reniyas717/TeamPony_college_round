import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { ApproveWorkflowInputSchema } from "@/lib/validations/workflow";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { workflowErrorResponse } from "../../_errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workflows/[id]/approve
 * Human-in-the-loop sign-off for paused approval gate checkpoints.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await requireOwnerContext();
    const json = await request.json().catch(() => null);
    const parsed = ApproveWorkflowInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid approval payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const run = await WorkflowEngineService.approveWorkflowRun(
      context,
      id,
      parsed.data.runId,
      parsed.data.approved,
      parsed.data.reason
    );

    return NextResponse.json({ data: run }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to record approval decision");
  }
}
