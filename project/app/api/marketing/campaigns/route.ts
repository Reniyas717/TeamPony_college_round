import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { MarketingService } from "@/services/marketing.service";
import { CreateCampaignSchema } from "@/lib/validations/marketing";

export async function GET() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const campaigns = await MarketingService.listCampaigns();
    const analytics = await MarketingService.getAnalyticsOverview();

    return NextResponse.json({
      data: {
        campaigns,
        overview: analytics,
        analytics,
      },
    });
  } catch (error) {
    console.error("[API /api/marketing/campaigns GET] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to retrieve marketing campaigns" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
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

    const campaign = await MarketingService.createCampaign(parsed.data);

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    console.error("[API /api/marketing/campaigns POST] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create campaign draft" } },
      { status: 500 }
    );
  }
}
