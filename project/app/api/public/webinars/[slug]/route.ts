import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PublicWebinarSlugSchema } from "@/lib/validations/webinar-registration";

type Context = { params: Promise<{ slug: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

export async function GET(_request: Request, { params }: Context) {
  const slug = PublicWebinarSlugSchema.safeParse((await params).slug);
  if (!slug.success) return errorResponse("VALIDATION_ERROR", "Invalid webinar link.", 400);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_webinar_registration_form", {
    p_public_slug: slug.data,
  });

  if (error) {
    if (error.message.includes("WEBINAR_NOT_FOUND")) {
      return errorResponse("NOT_FOUND", "This webinar is no longer available.", 404);
    }
    return errorResponse("INTERNAL_ERROR", "Could not load this webinar.", 500);
  }

  return NextResponse.json({ data });
}
