import { NextResponse } from "next/server";
import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { MarketingService } from "@/services/marketing.service";
import { CreateCampaignSchema } from "@/lib/validations/marketing";

export async function GET() {
  try {
    const context = await requireOwnerContext();
    const campaigns = await MarketingService.listCampaigns(context);
    const analytics = await MarketingService.getAnalyticsOverview(context);

    return NextResponse.json({
      data: {
        campaigns,
        overview: analytics,
        analytics,
      },
    });
  } catch (error) {
    return (
      ownerContextErrorResponse(error) ??
      NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to retrieve marketing campaigns" } },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOwnerContext();
    const json = await request.json().catch(() => null);
    const parsed = CreateCampaignSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid campaign payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const campaign = await MarketingService.createCampaign(parsed.data, context);

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    return (
      ownerContextErrorResponse(error) ??
      NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to create campaign draft" } },
        { status: 500 }
      )
    );
  }
}
