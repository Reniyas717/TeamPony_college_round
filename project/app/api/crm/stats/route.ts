import { NextResponse } from "next/server";
import { CrmService } from "@/services/crm.service";

/**
 * /api/crm/stats
 * Computes live conversion metrics, funnel counts, and total pipeline deal values.
 */

export async function GET() {
  try {
    const stats = await CrmService.getStats();
    return NextResponse.json({ data: stats }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to compute CRM stats",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
