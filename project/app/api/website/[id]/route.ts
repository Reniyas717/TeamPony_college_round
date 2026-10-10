import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WebsiteService } from "@/services/website.service";
import { UpdateWebsiteInputSchema } from "@/lib/validations/website";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business?.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No business workspace found for user" } },
        { status: 404 }
      );
    }

    const website = await WebsiteService.getWebsite(business.id, id);
    if (!website) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Website not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: website });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business?.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No business workspace found for user" } },
        { status: 404 }
      );
    }

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
      business.id,
      user.id,
      id,
      parsed.data
    );

    return NextResponse.json({ data: updatedWebsite });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business?.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No business workspace found for user" } },
        { status: 404 }
      );
    }

    const result = await WebsiteService.deleteWebsite(business.id, user.id, id);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
