import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WebsiteService } from "@/services/website.service";
import { z } from "zod";

const PublishInputSchema = z.object({
  isPublished: z.boolean(),
});

export async function POST(
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

    const json = await request.json().catch(() => ({ isPublished: true }));
    const parsed = PublishInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid publish input" } },
        { status: 400 }
      );
    }

    const updated = await WebsiteService.setPublishStatus(
      business.id,
      user.id,
      id,
      parsed.data.isPublished
    );

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
