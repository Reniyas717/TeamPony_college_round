import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { JourneyMapService } from "@/services/journey-map.service";
import { journeyMapErrorResponse } from "./route-utils";

export async function GET() {
  try {
    const context = await requireOwnerContext();
    const maps = await JourneyMapService.getJourneyMaps(context);
    return NextResponse.json({ data: maps }, { status: 200 });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}
