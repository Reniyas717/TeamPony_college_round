import { NextResponse } from "next/server";
import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { MarketingService } from "@/services/marketing.service";
import { UpdateCampaignSchema } from "@/lib/validations/marketing";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireOwnerContext();
    const { id } = await props.params;
    const campaign = await MarketingService.getCampaignById(id, context);

    if (!campaign) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: campaign });
  } catch (error) {
    return (
      ownerContextErrorResponse(error) ??
      NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to fetch campaign" } },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireOwnerContext();
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

    const updated = await MarketingService.updateCampaign(id, parsed.data, context);
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return (
      ownerContextErrorResponse(error) ??
      NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to update campaign" } },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireOwnerContext();
    const { id } = await props.params;
    const deleted = await MarketingService.deleteCampaign(id, context);

    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found or could not be deleted" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true, id } });
  } catch (error) {
    return (
      ownerContextErrorResponse(error) ??
      NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to delete campaign" } },
        { status: 500 }
      )
    );
  }
}
