import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";

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
    const workflow = await WorkflowEngineService.getWorkflowById(id);

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
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch workflow",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 * Deletes a workflow.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = await WorkflowEngineService.deleteWorkflow(id);

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
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to delete workflow",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
