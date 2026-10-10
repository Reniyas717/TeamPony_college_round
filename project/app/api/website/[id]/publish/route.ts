import { NextResponse } from "next/server";
import {
  WebsiteService,
  WebsiteServiceError,
} from "@/services/website.service";
import { z } from "zod";
import {
  ownerContextErrorResponse,
  requireOwnerContext,
} from "@/lib/supabase/owner-context";

function websiteErrorResponse(error: unknown) {
  const ownerError = ownerContextErrorResponse(error);
  if (ownerError) return ownerError;

  if (error instanceof WebsiteServiceError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: null } },
      { status: error.status }
    );
  }

  console.error("[WEBSITE_API_ERROR]", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Unable to complete website request", details: null } },
    { status: 500 }
  );
}

const PublishInputSchema = z.object({
  isPublished: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await requireOwnerContext();

    const json = await request.json().catch(() => ({ isPublished: true }));
    const parsed = PublishInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid publish input" } },
        { status: 400 }
      );
    }

    const updated = await WebsiteService.setPublishStatus(
      owner,
      id,
      parsed.data.isPublished
    );

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    return websiteErrorResponse(error);
  }
}
