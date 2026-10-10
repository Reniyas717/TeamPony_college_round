import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { queueRegistrationConfirmations } from "@/services/webinar/registration-confirmation.service";
import {
  PublicWebinarRegistrationSchema,
  PublicWebinarSlugSchema,
} from "@/lib/validations/webinar-registration";
import { recordWebinarAudit } from "@/services/webinar/audit";

type Context = { params: Promise<{ slug: string }> };

const conflictCodes = new Set([
  "CAPACITY_REACHED",
  "DUPLICATE_REGISTRATION",
  "REGISTRATION_CLOSED",
  "WEBINAR_UNAVAILABLE",
]);

const conflictMessages: Record<string, string> = {
  CAPACITY_REACHED: "One or more selected sessions are full.",
  DUPLICATE_REGISTRATION: "This email is already registered for one of the selected sessions.",
  REGISTRATION_CLOSED: "Registration has closed for one of the selected sessions.",
  WEBINAR_UNAVAILABLE: "One of the selected sessions is no longer available.",
};

function errorResponse(code: string, message: string, status: number, details: unknown = null) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export async function POST(request: Request, { params }: Context) {
  const slug = PublicWebinarSlugSchema.safeParse((await params).slug);
  if (!slug.success) return errorResponse("VALIDATION_ERROR", "Invalid webinar link.", 400);

  const parsed = PublicWebinarRegistrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Enter your name, email, and session selection.", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const emailBucket = createHash("sha256").update(`email:${slug.data}:${parsed.data.email.trim().toLowerCase()}`).digest("hex");
  const rateChecks = [
    supabase.rpc("take_webinar_registration_rate_limit", { p_bucket_hash: emailBucket, p_limit: 5, p_window_seconds: 60 }),
  ];
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  if (forwardedIp) {
    const ipBucket = createHash("sha256").update(`ip:${slug.data}:${forwardedIp}`).digest("hex");
    rateChecks.push(supabase.rpc("take_webinar_registration_rate_limit", { p_bucket_hash: ipBucket, p_limit: 30, p_window_seconds: 60 }));
  }
  const limits = await Promise.all(rateChecks);
  if (limits.some((result) => result.error)) return errorResponse("INTERNAL_ERROR", "Registration is temporarily unavailable.", 503);
  if (limits.some((result) => result.data !== true)) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many registration attempts. Try again in a minute.", details: null } }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { data, error } = await supabase.rpc("register_public_webinar_attendee", {
    p_public_slug: slug.data,
    p_full_name: parsed.data.name,
    p_email: parsed.data.email,
    p_selected_session_slugs: parsed.data.selected_session_slugs ?? [slug.data],
    p_marketing_opt_in: parsed.data.marketing_opt_in,
  });

  if (error) {
    const message = error.message;
    if (message.includes("WEBINAR_NOT_FOUND")) return errorResponse("NOT_FOUND", "This webinar is no longer available.", 404);
    if (message.includes("INVALID_SESSION_SELECTION")) return errorResponse("INVALID_SESSION_SELECTION", "Choose at least one available session.", 422);
    if (message.includes("INVALID_REQUEST")) return errorResponse("VALIDATION_ERROR", "The submitted details are invalid.", 400);
    for (const code of conflictCodes) {
      if (message.includes(code)) return errorResponse(code, conflictMessages[code] ?? "Registration is unavailable.", 409);
    }
    return errorResponse("INTERNAL_ERROR", "Could not record your registration.", 500);
  }

  const registrationId = typeof data?.registration_id === "string" ? data.registration_id : null;
  const notifications = registrationId
    ? await queueRegistrationConfirmations(registrationId)
    : { status: "not_queued" as const };

  if (registrationId) {
    const admin = createAdminClient();
    const [{ data: registration }, { data: selection }] = await Promise.all([
      admin.from("webinar_registrations").select("business_id").eq("id", registrationId).maybeSingle(),
      admin.from("webinar_registration_sessions").select("webinar_id").eq("registration_id", registrationId).order("webinar_id").limit(1).maybeSingle(),
    ]);
    if (registration?.business_id) {
      const context = { businessId: registration.business_id };
      await recordWebinarAudit(context, {
        action: "webinar.notification.queued", resourceType: "webinar_registration", resourceId: registrationId,
        actorId: "webinar_public", actorType: "integration",
        client: admin,
        outcome: notifications.status === "queued" || notifications.status === "partially_queued" ? "success" : "failure",
        metadata: { webinar_id: selection?.webinar_id ?? registrationId, operation_id: `${registrationId}/confirmation`, recipient_count: notifications.count ?? 0, notification_type: "registration_confirmation" },
      });
    }
  }

  return NextResponse.json({ data: { ...data, notifications } }, { status: 201 });
}
