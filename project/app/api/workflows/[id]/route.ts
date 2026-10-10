import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { workflowErrorResponse } from "../_errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workflows/[id]
 * Retrieves details of a specific workflow.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await requireOwnerContext();
    const workflow = await WorkflowEngineService.getWorkflowById(context, id);

    if (!workflow) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Workflow '${id}' was not found`,
            details: null,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: workflow }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to fetch workflow");
  }
}

/**
 * DELETE /api/workflows/[id]
 * Deletes a workflow.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await requireOwnerContext();
    const deleted = await WorkflowEngineService.deleteWorkflow(context, id);

    if (!deleted) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Workflow '${id}' not found or could not be deleted`,
            details: null,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to delete workflow");
  }
}
