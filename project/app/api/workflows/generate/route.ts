import { NextResponse } from "next/server";
import { WorkflowAIService } from "@/services/workflow-ai.service";
import { GenerateWorkflowInputSchema } from "@/lib/validations/workflow";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { workflowErrorResponse } from "../_errors";

/**
 * POST /api/workflows/generate
 * Translates natural language prompts into executable DAG workflows.
 */
export async function POST(request: Request) {
  try {
    await requireOwnerContext();
    const json = await request.json().catch(() => null);
    const parsed = GenerateWorkflowInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid prompt payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const dag = await WorkflowAIService.compilePromptToDAG(parsed.data.prompt);

    return NextResponse.json({ data: dag }, { status: 200 });
  } catch (err: unknown) {
    return workflowErrorResponse(err, "Failed to compile workflow prompt");
  }
}
