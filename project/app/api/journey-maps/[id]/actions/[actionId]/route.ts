import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { ExecuteActionInputSchema } from "@/lib/validations/journey-map";
import { JourneyMapService } from "@/services/journey-map.service";
import { journeyMapErrorResponse } from "../../../route-utils";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { id, actionId } = await props.params;
    const context = await requireOwnerContext();
    const body = await request.json().catch(() => ({}));
    const parsed = ExecuteActionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid action payload",
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updatedAction = await JourneyMapService.executeAction(context, id, actionId, parsed.data.decision);

    if (!updatedAction) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Action or map not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updatedAction }, { status: 200 });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}
