import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getGoogleEmailSenderForBusiness, GoogleTokenVaultError } from "./google-token-vault.service";
import { processWebinarEmailOutbox } from "./email-worker.service";

type Registration = { id: string; business_id: string; email: string; full_name: string };
type RegistrationSession = { business_id: string; webinar_id: string };
type Business = { id: string; owner_id: string; name: string };
type Webinar = {
  id: string;
  title: string;
  scheduled_start: string | null;
  timezone: string;
  meeting_uri: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function formatSessionTime(webinar: Webinar) {
  if (!webinar.scheduled_start) return "Time to be announced";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: webinar.timezone,
  }).format(new Date(webinar.scheduled_start));
}

export async function queueRegistrationConfirmations(registrationId: string) {
  const admin = createAdminClient();
  const { data: rawRegistration, error: registrationError } = await admin
    .from("webinar_registrations")
    .select("id,business_id,email,full_name")
    .eq("id", registrationId)
    .maybeSingle();
  if (registrationError || !rawRegistration) return { status: "not_queued" as const };
  const registration = rawRegistration as Registration;
  let from: string;
  try {
    from = await getGoogleEmailSenderForBusiness(registration.business_id);
  } catch (error) {
    return { status: error instanceof GoogleTokenVaultError
      && (error.code === "RECONNECT_REQUIRED" || error.code === "NOT_CONNECTED")
      ? "gmail_reconnect_required" as const
      : "not_configured" as const };
  }

  const { data: rawSelections, error: selectionsError } = await admin
    .from("webinar_registration_sessions")
    .select("business_id,webinar_id")
    .eq("business_id", registration.business_id)
    .eq("registration_id", registration.id);
  if (selectionsError || !rawSelections?.length) return { status: "not_queued" as const };
  const selections = rawSelections as RegistrationSession[];

  const [{ data: rawBusiness, error: businessError }, { data: rawWebinars, error: webinarsError }] = await Promise.all([
    admin.from("businesses").select("id,owner_id,name").eq("id", registration.business_id).maybeSingle(),
    admin.from("webinars").select("id,title,scheduled_start,timezone,meeting_uri")
      .eq("business_id", registration.business_id)
      .in("id", selections.map((selection) => selection.webinar_id)),
  ]);
  if (businessError || webinarsError || !rawBusiness || !rawWebinars) return { status: "not_queued" as const };
  const business = rawBusiness as Business;

  let queued = 0;
  let queueFailed = false;
  const effectKeys: string[] = [];
  for (const rawWebinar of rawWebinars) {
    const webinar = rawWebinar as Webinar;
    const time = formatSessionTime(webinar);
    const greeting = escapeHtml(registration.full_name);
    const businessName = escapeHtml(business.name);
    const title = escapeHtml(webinar.title);
    const meetLink = webinar.meeting_uri
      ? `<p><a href="${escapeHtml(webinar.meeting_uri)}">Join the Google Meet</a></p>`
      : "<p>Your organizer will share the meeting link before the session.</p>";
    const { error } = await admin.rpc("enqueue_webinar_email", {
      p_business_id: registration.business_id,
      p_webinar_id: webinar.id,
      p_kind: "registration_confirmation",
      p_effect_key: `registration-confirmation/${registration.id}/${webinar.id}`,
      p_to_email: registration.email,
      p_from_email: from,
      p_reply_to_email: from,
      p_subject: `Registration confirmed: ${webinar.title}`,
      p_html_body: `<p>Hi ${greeting},</p><p>Your registration for <strong>${title}</strong> with ${businessName} is confirmed.</p><p>${escapeHtml(time)} (${escapeHtml(webinar.timezone)})</p>${meetLink}`,
      p_text_body: `Hi ${registration.full_name},\n\nYour registration for ${webinar.title} with ${business.name} is confirmed.\n${time} (${webinar.timezone})\n${webinar.meeting_uri ? `Join the Google Meet: ${webinar.meeting_uri}` : "Your organizer will share the meeting link before the session."}`,
      p_payload: { registration_id: registration.id },
      p_scheduled_for: new Date().toISOString(),
      p_max_attempts: 5,
    });
    if (error) {
      queueFailed = true;
      break;
    }
    queued += 1;
    effectKeys.push(`registration-confirmation/${registration.id}/${webinar.id}`);
  }

  if (queued === 0) return { status: "not_queued" as const };

  let accepted = 0;
  let retryQueued = 0;
  let failed = 0;
  let reconnectRequired = 0;
  let unknown = 0;
  let pending = 0;
  for (const effectKey of effectKeys) {
    try {
      const result = await processWebinarEmailOutbox(1, registration.business_id, effectKey);
      accepted += result.provider_accepted;
      retryQueued += result.retry_queued;
      failed += result.failed;
      reconnectRequired += result.reconnect_required;
      unknown += result.unknown + result.finalization_failed;
      if (result.claimed === 0) pending += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.name : "UnknownError";
      console.error(`[WEBINAR-REGISTRATION-DELIVERY-FAILED] reason=${reason}`);
      pending += 1;
    }
  }

  const deliveryStatus = unknown > 0
    ? "unknown" as const
    : reconnectRequired > 0
      ? "gmail_reconnect_required" as const
    : retryQueued > 0
      ? "retry_queued" as const
        : failed > 0
          ? "failed" as const
      : pending > 0
        ? "pending" as const
        : accepted === queued
          ? "provider_accepted" as const
          : "pending" as const;

  return {
    status: queueFailed ? "partially_queued" as const : "queued" as const,
    count: queued,
    deliveryStatus,
  };
}
