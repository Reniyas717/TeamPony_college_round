import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { GenerateJourneyMapInputSchema } from "@/lib/validations/journey-map";
import { JourneyMapService } from "@/services/journey-map.service";
import { journeyMapErrorResponse } from "../route-utils";

export async function POST(request: Request) {
  try {
    const context = await requireOwnerContext();
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

    const map = await JourneyMapService.generateJourneyMap(context, parsed.data);
    return NextResponse.json({ data: map }, { status: 201 });
  } catch (error) {
    return journeyMapErrorResponse(error);
  }
}
