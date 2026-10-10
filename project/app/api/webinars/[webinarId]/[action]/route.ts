import { NextResponse } from "next/server";
import { WebinarActionSchema, WebinarRescheduleSchema } from "@/lib/validations/webinar";
import { cancelWebinar, getWebinar, getWebinarCancellationPreview, getWebinarDeletePreview, getWebinarReschedulePreview, rescheduleWebinar, scheduleWebinar, WebinarServiceError } from "@/services/webinar/session.service";

type Context = { params: Promise<{ webinarId: string; action: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { webinarId, action } = await params;
  if (action === "delete-preview") {
    try { return NextResponse.json({ data: await getWebinarDeletePreview(webinarId) }); }
    catch (error) {
      if (error instanceof WebinarServiceError) return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status: error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 500 });
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not load deletion preview.", details: null } }, { status: 500 });
    }
  }
  if (action === "reschedule-preview") {
    try { return NextResponse.json({ data: await getWebinarReschedulePreview(webinarId) }); }
    catch (error) {
      if (error instanceof WebinarServiceError) return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status: error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 500 });
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not load reschedule preview.", details: null } }, { status: 500 });
    }
  }
  if (action !== "cancel-preview") return NextResponse.json({ error: { code: "NOT_FOUND", message: "Webinar action not found.", details: null } }, { status: 404 });
  try {
    return NextResponse.json({ data: await getWebinarCancellationPreview(webinarId) });
  } catch (error) {
    if (error instanceof WebinarServiceError) {
      const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 500;
      return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not load cancellation preview.", details: null } }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  const body = await request.json().catch(() => null);
  const { webinarId, action } = await params;
  if (action === "reschedule") {
    const parsedReschedule = WebinarRescheduleSchema.safeParse(body);
    if (!parsedReschedule.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid reschedule details.", details: parsedReschedule.error.flatten() } }, { status: 400 });
    try { return NextResponse.json({ data: await rescheduleWebinar(webinarId, parsedReschedule.data, parsedReschedule.data.expected_recipient_count, parsedReschedule.data.expected_recipient_snapshot_hash) }); }
    catch (error) {
      if (error instanceof WebinarServiceError) return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status: error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 500 });
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not reschedule webinar.", details: null } }, { status: 500 });
    }
  }
  const parsed = WebinarActionSchema.safeParse(body);
  if (!parsed.success || parsed.data.expected_version === undefined) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid action details or missing version.", details: parsed.success ? { expected_version: ["Required"] } : parsed.error.flatten() } }, { status: 400 });
  let webinar: Awaited<ReturnType<typeof getWebinar>>;
  try { webinar = await getWebinar(webinarId); }
  catch (error) {
    if (error instanceof WebinarServiceError) return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status: error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : 500 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Webinar request failed.", details: null } }, { status: 500 });
  }

  if (parsed.data.expected_version !== undefined && webinar.version !== parsed.data.expected_version) return NextResponse.json({ error: { code: "CONFLICT", message: "This webinar changed. Reload it before continuing.", details: null } }, { status: 409 });

  const messages: Record<string, string> = {
    followup: "Follow-ups are unavailable until attendance review and durable email delivery are configured.",
  };
  if (action === "schedule") {
    try {
      return NextResponse.json({ data: await scheduleWebinar(webinarId, parsed.data.expected_version) });
    } catch (error) {
      if (error instanceof WebinarServiceError) {
        const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : error.code === "INTEGRATION_REQUIRED" || error.code === "CONFLICT" ? 409 : 500;
        return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status });
      }
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not schedule webinar.", details: null } }, { status: 500 });
    }
  }
  if (action === "cancel") {
    try {
      if (parsed.data.expected_recipient_count === undefined) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Review the attendee count before cancelling.", details: null } }, { status: 400 });
      return NextResponse.json({ data: await cancelWebinar(webinarId, parsed.data.expected_version, parsed.data.expected_recipient_count) });
    } catch (error) {
      if (error instanceof WebinarServiceError) {
        const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : error.code === "INTEGRATION_REQUIRED" || error.code === "CONFLICT" ? 409 : 500;
        return NextResponse.json({ error: { code: error.code, message: error.message, details: null } }, { status });
      }
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not cancel webinar.", details: null } }, { status: 500 });
    }
  }
  if (!messages[action]) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Webinar action not found.", details: null } }, { status: 404 });
  return NextResponse.json({ error: { code: "INTEGRATION_REQUIRED", message: messages[action], details: null } }, { status: 409 });
}
