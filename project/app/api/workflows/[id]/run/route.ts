import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { workflowErrorResponse } from "../../_errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await requireOwnerContext();
    const run = await WorkflowEngineService.getLatestRun(context, id);
    return NextResponse.json({ data: run }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to fetch the latest workflow run");
  }
}
