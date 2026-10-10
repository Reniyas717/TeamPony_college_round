import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { MarketingService } from "@/services/marketing.service";
import { PreviewSegmentSchema } from "@/lib/validations/marketing";

export async function POST(request: Request) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const json = await request.json().catch(() => null);
    const parsed = PreviewSegmentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid segment preview payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const preview = await MarketingService.previewSegment(
      parsed.data.segment_filters,
      parsed.data.channel
    );

    return NextResponse.json({
      data: {
        totalEligible: preview.eligibleContacts.length,
        totalSuppressed: preview.suppressedCount,
        totalMatched: preview.totalMatched,
        sampleRecipients: preview.eligibleContacts.slice(0, 5).map((c) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          email: c.email,
          phone: c.phone,
          company: c.company,
          stage: c.stage,
          tags: c.tags,
          value: c.value,
        })),
      },
    });
  } catch (error) {
    console.error("[API /api/marketing/segment/preview] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to calculate audience preview" } },
      { status: 500 }
    );
  }
}
