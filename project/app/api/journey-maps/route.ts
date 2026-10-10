import { NextResponse } from "next/server";
import { JourneyMapService } from "@/services/journey-map.service";

export async function GET() {
  try {
    const maps = await JourneyMapService.getJourneyMaps();
    return NextResponse.json({ data: maps }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch journey maps";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
