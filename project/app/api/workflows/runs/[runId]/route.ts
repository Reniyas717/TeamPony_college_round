import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { workflowErrorResponse } from "../../_errors";

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
    const context = await requireOwnerContext();
    const stepLogs = await WorkflowEngineService.getRunStepLogs(context, runId);

    return NextResponse.json({ data: stepLogs }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to fetch run step logs");
  }
}
