import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { JourneyMapService } from "@/services/journey-map.service";
import { journeyMapErrorResponse } from "../route-utils";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, props: RouteProps) {
  try {
    const { id } = await props.params;
    const context = await requireOwnerContext();
    const map = await JourneyMapService.getJourneyMapById(context, id);
    if (!map) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Journey map not found", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: map });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}

export async function DELETE(_request: Request, props: RouteProps) {
  try {
    const { id } = await props.params;
    const context = await requireOwnerContext();
    const deleted = await JourneyMapService.deleteMap(context, id);
    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Journey map not found", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}
