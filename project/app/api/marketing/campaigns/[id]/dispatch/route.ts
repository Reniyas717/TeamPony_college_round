import { NextResponse } from "next/server";
import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { MarketingService } from "@/services/marketing.service";
import { DispatchCampaignSchema } from "@/lib/validations/marketing";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireOwnerContext();
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

    const result = await MarketingService.dispatchCampaign(id, parsed.data.approved, context);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[MARKETING-DISPATCH-ERROR]", error);
    return (
      ownerContextErrorResponse(error) ??
      NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to dispatch campaign",
          },
        },
        { status: 500 }
      )
    );
  }
}
