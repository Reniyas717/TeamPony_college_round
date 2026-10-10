import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { AddStageInputSchema } from "@/lib/validations/journey-map";
import { JourneyMapService } from "@/services/journey-map.service";
import { journeyMapErrorResponse } from "../../route-utils";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const context = await requireOwnerContext();
    const parsed = AddStageInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid stage payload", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }
    const stage = await JourneyMapService.addStage(context, id, parsed.data);
    if (!stage) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Journey map not found", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: stage }, { status: 201 });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}
