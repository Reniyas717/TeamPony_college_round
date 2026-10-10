import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { ApproveWorkflowInputSchema } from "@/lib/validations/workflow";

/**
 * POST /api/workflows/[id]/approve
 * Human-in-the-loop sign-off for paused approval gate checkpoints.
 */
export async function POST(request: Request) {
  try {
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
      parsed.data.runId,
      parsed.data.approved,
      parsed.data.reason
    );

    return NextResponse.json({ data: run }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to record approval decision",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
