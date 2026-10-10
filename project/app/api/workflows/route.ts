import { NextResponse } from "next/server";
import { WorkflowEngineService } from "@/services/workflow-engine.service";
import { CreateWorkflowSchema } from "@/lib/validations/workflow";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { workflowErrorResponse } from "./_errors";

/**
 * GET /api/workflows
 * Lists all active and draft workflows for the business.
 */
export async function GET() {
  try {
    const context = await requireOwnerContext();
    const workflows = await WorkflowEngineService.listWorkflows(context);
    return NextResponse.json({ data: workflows }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to fetch workflows");
  }
}

/**
 * POST /api/workflows
 * Registers and persists a new workflow DAG.
 */
export async function POST(request: Request) {
  try {
    const context = await requireOwnerContext();
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

    const created = await WorkflowEngineService.createWorkflow(context, parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to create workflow");
  }
}
