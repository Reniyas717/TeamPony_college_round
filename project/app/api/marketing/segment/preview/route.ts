import { NextResponse } from "next/server";
import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { MarketingService } from "@/services/marketing.service";
import { PreviewSegmentSchema } from "@/lib/validations/marketing";

export async function POST(request: Request) {
  try {
    const context = await requireOwnerContext();
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
      parsed.data.channel,
      context
    );

    return NextResponse.json({
      data: {
        totalEligible: preview.eligibleContacts.length,
        totalSuppressed: preview.suppressedCount,
        totalMatched: preview.totalMatched,
        eligibleContacts: preview.eligibleContacts,
        suppressedCount: preview.suppressedCount,
        sampleRecipients: preview.eligibleContacts.slice(0, 10).map((c) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`.trim(),
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
    return (
      ownerContextErrorResponse(error) ??
      NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to calculate audience preview" } },
        { status: 500 }
      )
    );
  }
}
