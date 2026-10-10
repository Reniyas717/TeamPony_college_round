import { NextResponse } from "next/server";
import {
  WebsiteService,
  WebsiteServiceError,
} from "@/services/website.service";
import { CreateWebsiteInputSchema } from "@/lib/validations/website";
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

export async function GET() {
  try {
    const owner = await requireOwnerContext();
    const websites = await WebsiteService.listWebsites(owner);
    return NextResponse.json({ data: websites });
  } catch (error: unknown) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwnerContext();

    const json = await request.json().catch(() => null);
    const parsed = CreateWebsiteInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid website payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const newWebsite = await WebsiteService.createWebsite(
      owner,
      parsed.data
    );

    return NextResponse.json({ data: newWebsite }, { status: 201 });
  } catch (error: unknown) {
    return websiteErrorResponse(error);
  }
}
