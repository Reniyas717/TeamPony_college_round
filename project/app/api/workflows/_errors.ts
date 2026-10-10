import { NextResponse } from "next/server";
import { ownerContextErrorResponse } from "@/lib/supabase/owner-context";
import { WorkflowServiceError } from "@/services/workflow-engine.service";

export function workflowErrorResponse(error: unknown, fallbackMessage: string): Response {
  const ownerResponse = ownerContextErrorResponse(error);
  if (ownerResponse) return ownerResponse;

  if (error instanceof WorkflowServiceError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: null } },
      { status: error.status }
    );
  }

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: fallbackMessage, details: null } },
    { status: 500 }
  );
}
