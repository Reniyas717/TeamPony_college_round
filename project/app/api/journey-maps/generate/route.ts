import { NextResponse } from "next/server";
import { GenerateJourneyMapInputSchema } from "@/lib/validations/journey-map";
import { JourneyMapService } from "@/services/journey-map.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = GenerateJourneyMapInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid journey generation parameters",
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const map = await JourneyMapService.generateJourneyMap(parsed.data);
    return NextResponse.json({ data: map }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate journey map";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
