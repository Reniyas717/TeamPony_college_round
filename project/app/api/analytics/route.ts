import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsService } from "@/services/analytics.service";

async function resolveBusinessId(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (business?.id) {
        return business.id;
      }
    }
  } catch {
    // Demo fallback
  }
  return "00000000-0000-0000-0000-000000000001";
}

export async function GET() {
  try {
    const businessId = await resolveBusinessId();
    const analytics = await AnalyticsService.getDashboardData(businessId);
    return NextResponse.json({ data: analytics }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load analytics dashboard";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
