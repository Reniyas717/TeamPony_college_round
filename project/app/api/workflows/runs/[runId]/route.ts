import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

/**
 * GET /api/workflows/runs/[runId]
 * Fetches step execution logs and telemetry for a specific run.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const stepLogs = await WorkflowEngineService.getRunStepLogs(runId);

    return NextResponse.json({ data: stepLogs }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch run step logs",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
