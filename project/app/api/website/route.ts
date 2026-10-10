import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WebsiteService } from "@/services/website.service";
import { CreateWebsiteInputSchema } from "@/lib/validations/website";

export async function GET() {
  try {
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

    const websites = await WebsiteService.listWebsites(business.id);
    return NextResponse.json({ data: websites });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
      business.id,
      user.id,
      parsed.data
    );

    return NextResponse.json({ data: newWebsite }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
