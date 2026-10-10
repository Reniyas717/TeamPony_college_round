import { NextResponse } from "next/server";
import { JourneyMapService } from "@/services/journey-map.service";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const map = await JourneyMapService.getJourneyMapById(id);
    if (!map) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Journey map not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: map }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch journey map";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const success = await JourneyMapService.deleteMap(id);
    if (!success) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Journey map not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete journey map";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
