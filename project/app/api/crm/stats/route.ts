import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { CrmService, CrmServiceError } from "@/services/crm.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const context = await requireOwnerContext();
    const stats = await CrmService.getStats(context);
    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (error) {
    if (error instanceof CrmServiceError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: null } },
        { status: error.status }
      );
    }
    return ownerContextErrorResponse(error) ?? NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to compute CRM stats", details: null } },
      { status: 500 }
    );
  }
}
