import { NextResponse } from "next/server";
import {
  WebsiteService,
  WebsiteServiceError,
} from "@/services/website.service";
import { UpdateWebsiteInputSchema } from "@/lib/validations/website";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await requireOwnerContext();

    const website = await WebsiteService.getWebsite(owner, id);
    if (!website) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Website not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: website });
  } catch (error: unknown) {
    return websiteErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await requireOwnerContext();

    const json = await request.json().catch(() => null);
    const parsed = UpdateWebsiteInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid update payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const updatedWebsite = await WebsiteService.updateWebsite(
      owner,
      id,
      parsed.data
    );

    return NextResponse.json({ data: updatedWebsite });
  } catch (error: unknown) {
    return websiteErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await requireOwnerContext();

    const result = await WebsiteService.deleteWebsite(owner, id);
    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    return websiteErrorResponse(error);
  }
}
