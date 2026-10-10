import { NextResponse } from "next/server";

import { WebinarFollowupActionSchema } from "@/lib/validations/webinar-followup";
import { getWebinarFollowup, saveWebinarFollowupDrafts, scheduleWebinarFollowup, WebinarFollowupError } from "@/services/webinar/followup.service";

type Context = { params: Promise<{ webinarId: string }> };

function errorResponse(error: unknown) {
  if (error instanceof WebinarFollowupError) {
    const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : error.code === "BLOCKED" ? 422 : 500;
    return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not manage webinar follow-ups.", details: null } }, { status: 500 });
}

export async function GET(_request: Request, { params }: Context) {
  try { return NextResponse.json({ data: await getWebinarFollowup((await params).webinarId) }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  const json = await request.json().catch(() => null);
  const parsed = WebinarFollowupActionSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid follow-up details.", details: parsed.error.flatten() } }, { status: 400 });
  try {
    const webinarId = (await params).webinarId;
    const data = parsed.data.action === "save_drafts"
      ? await saveWebinarFollowupDrafts(webinarId, parsed.data)
      : await scheduleWebinarFollowup(webinarId, parsed.data);
    return NextResponse.json({ data });
  } catch (error) { return errorResponse(error); }
}
