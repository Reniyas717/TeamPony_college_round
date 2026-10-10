import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { CreateWorkflowSchema } from "@/lib/validations/workflow";

/**
 * GET /api/workflows
 * Lists all active and draft workflows for the business.
 */
export async function GET() {
  try {
    const workflows = await WorkflowEngineService.listWorkflows();
    return NextResponse.json({ data: workflows }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch workflows",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * Registers and persists a new workflow DAG.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateWorkflowSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed for workflow definition",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const created = await WorkflowEngineService.createWorkflow(parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to create workflow",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
