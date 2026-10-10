import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { MarketingService } from "@/services/marketing.service";
import { DispatchCampaignSchema } from "@/lib/validations/marketing";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { id } = await props.params;
  const json = await request.json().catch(() => ({}));
  const parsed = DispatchCampaignSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid dispatch payload",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await MarketingService.dispatchCampaign(id, parsed.data.approved);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(`[API /api/marketing/campaigns/${id}/dispatch] Error:`, error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to dispatch campaign" } },
      { status: 500 }
    );
  }
}
