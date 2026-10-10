import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { UpdateStageInputSchema } from "@/lib/validations/journey-map";
import { JourneyMapService } from "@/services/journey-map.service";
import { journeyMapErrorResponse } from "../../../route-utils";

type RouteProps = { params: Promise<{ id: string; stageId: string }> };

export async function PATCH(request: Request, props: RouteProps) {
  try {
    const { id, stageId } = await props.params;
    const context = await requireOwnerContext();
    const parsed = UpdateStageInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid stage payload", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }
    const stage = await JourneyMapService.updateStage(context, id, stageId, parsed.data);
    if (!stage) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Stage or journey map not found", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: stage });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}

export async function DELETE(_request: Request, props: RouteProps) {
  try {
    const { id, stageId } = await props.params;
    const context = await requireOwnerContext();
    const deleted = await JourneyMapService.deleteStage(context, id, stageId);
    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Stage or journey map not found", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}
