import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { MarketingService } from "@/services/marketing.service";
import { UpdateCampaignSchema } from "@/lib/validations/marketing";

export async function GET(
  _request: Request,
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
  const campaign = await MarketingService.getCampaignById(id);

  if (!campaign) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Campaign not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: campaign });
}

export async function PATCH(
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
  const json = await request.json().catch(() => null);
  const parsed = UpdateCampaignSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid update payload",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const updated = await MarketingService.updateCampaign(id, parsed.data);
  if (!updated) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Campaign not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
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
  const deleted = await MarketingService.deleteCampaign(id);

  if (!deleted) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Campaign not found or could not be deleted" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { success: true, id } });
}
