import { NextResponse } from "next/server";
import { requireOwnerContext, ownerContextErrorResponse } from "@/lib/supabase/owner-context";
import { CrmAnalyticsService } from "@/services/crm-analytics.service";

export async function GET() {
  try {
    const context = await requireOwnerContext();
    const analytics = await CrmAnalyticsService.getCrmAnalytics(context);
    return NextResponse.json({ data: analytics }, { status: 200 });
  } catch (error) {
    const authErr = ownerContextErrorResponse(error);
    if (authErr) return authErr;

    console.error("[API /api/crm/analytics] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load CRM analytics.",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
