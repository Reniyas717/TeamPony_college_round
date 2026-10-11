import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import type { WebinarFollowupDraftSchema, WebinarFollowupScheduleSchema } from "@/lib/validations/webinar-followup";
import { recordWebinarAudit } from "./audit";
import { getGoogleEmailSenderForBusiness, GoogleTokenVaultError } from "./google-token-vault.service";

type DraftInput = Omit<z.infer<typeof WebinarFollowupDraftSchema>, "action">;
type ScheduleInput = z.infer<typeof WebinarFollowupScheduleSchema>;

export class WebinarFollowupError extends Error {
  constructor(public code: "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "BLOCKED" | "DATABASE_ERROR" | "CONFIGURATION_ERROR", message: string) {
    super(message);
  }
}

async function ownerContext() {
  try {
    const context = await requireOwnerContext();
    return { ...context, supabase: context.client };
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as { status?: number }).status;
      if (status === 401) throw new WebinarFollowupError("UNAUTHORIZED", error.message);
      if (status === 404) throw new WebinarFollowupError("NOT_FOUND", error.message);
    }
    throw new WebinarFollowupError("DATABASE_ERROR", "Business data is temporarily unavailable.");
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

async function campaignForKind(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string, webinarId: string, kind: "attendee" | "no_show") {
  const { data, error } = await supabase.from("marketing_campaigns").select("*")
    .eq("business_id", businessId).eq("webinar_id", webinarId).eq("webinar_followup_kind", kind).maybeSingle();
  if (error) throw new WebinarFollowupError("DATABASE_ERROR", "Could not load webinar follow-up draft.");
  return data;
}

export async function getWebinarFollowup(webinarId: string) {
  const { businessId, supabase } = await ownerContext();
  const { data: webinar, error: webinarError } = await supabase.from("webinars")
    .select("id,title,status,version,scheduled_start,timezone,followup_enabled,product_url")
    .eq("business_id", businessId).eq("id", webinarId).maybeSingle();
  if (webinarError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not load webinar.");
  if (!webinar) throw new WebinarFollowupError("NOT_FOUND", "Webinar not found.");
  const [{ data: followup, error: followupError }, attendeeCampaign, noShowCampaign, { data: deliveries, error: deliveryError }] = await Promise.all([
    supabase.from("webinar_followups").select("*").eq("business_id", businessId).eq("webinar_id", webinarId).maybeSingle(),
    campaignForKind(supabase, businessId, webinarId, "attendee"),
    campaignForKind(supabase, businessId, webinarId, "no_show"),
    supabase.from("webinar_email_outbox").select("kind,status").eq("business_id", businessId).eq("webinar_id", webinarId)
      .in("kind", ["followup_attendee", "followup_no_show"]),
  ]);
  const [{ data: registrations, error: registrationsError }, { data: participants, error: participantsError }, { data: importState, error: importError }, { data: submitted, error: feedbackError }] = await Promise.all([
    supabase.from("webinar_registration_sessions").select("registration_id").eq("business_id", businessId).eq("webinar_id", webinarId),
    supabase.from("webinar_participants").select("registration_id,review_disposition").eq("business_id", businessId).eq("webinar_id", webinarId),
    supabase.from("webinar_attendance_imports").select("status,unresolved_count").eq("business_id", businessId).eq("webinar_id", webinarId).maybeSingle(),
    supabase.from("webinar_feedback").select("registration_id").eq("business_id", businessId).eq("webinar_id", webinarId).not("submitted_at", "is", null),
  ]);
  if (followupError || deliveryError || registrationsError || participantsError || importError || feedbackError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not load follow-up review data.");
  const attendeeIds = new Set((participants ?? []).filter((row) => row.review_disposition === "matched" && row.registration_id).map((row) => row.registration_id));
  const submittedIds = new Set((submitted ?? []).map((row) => row.registration_id));
  const eligible = [...new Set((registrations ?? []).map((row) => row.registration_id))];
  const ready = Boolean(importState?.status === "complete" && !(importState.unresolved_count ?? 0));
  const { data: contacts, error: contactsError } = eligible.length
    ? await supabase.from("webinar_registrations").select("id,email,full_name").eq("business_id", businessId).in("id", eligible)
    : { data: [], error: null };
  if (contactsError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not load follow-up recipients.");
  return {
    enabled: webinar.followup_enabled,
    version: webinar.version,
    status: followup?.status ?? (webinar.followup_enabled ? "draft" : "disabled"),
    scheduled_for: followup?.scheduled_for ?? null,
    approval_version: followup?.approval_version ?? 0,
    last_error: followup?.last_error ?? null,
    delivery: (deliveries ?? []).reduce((summary, row) => {
      summary[row.status] = (summary[row.status] ?? 0) + 1;
      return summary;
    }, {} as Record<string, number>),
    attendee: { subject: attendeeCampaign?.subject ?? "How was the webinar?", body: attendeeCampaign?.content ?? "Thanks for joining us. We would love to hear whether the session was helpful." },
    no_show: { subject: noShowCampaign?.subject ?? "We missed you at the webinar", body: noShowCampaign?.content ?? "We could not confirm your attendance. Here is a link to learn more." },
    eligible_recipient_count: ready ? eligible.filter((id) => !submittedIds.has(id)).length : null,
    attendance_ready: ready,
    attendee_count: ready ? eligible.filter((id) => attendeeIds.has(id) && !submittedIds.has(id)).length : null,
    no_show_count: ready ? eligible.filter((id) => !attendeeIds.has(id) && !submittedIds.has(id)).length : null,
    recipients: ready ? (contacts ?? []).filter((row) => !submittedIds.has(row.id)).map((row) => ({
      registration_id: row.id, name: row.full_name, email: row.email,
      audience: attendeeIds.has(row.id) ? "attendee" : "no_show",
    })) : [],
  };
}

async function cancelPendingFollowupJobs(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string, webinarId: string) {
  const { error } = await supabase.from("webinar_email_outbox").update({
    status: "cancelled", lease_owner: null, lease_expires_at: null,
    last_error: "Follow-up approval changed before delivery.",
  }).eq("business_id", businessId).eq("webinar_id", webinarId)
    .in("kind", ["followup_attendee", "followup_no_show"]).in("status", ["queued", "processing"]);
  if (error) throw new WebinarFollowupError("DATABASE_ERROR", "Could not cancel pending follow-up messages.");
}

export async function saveWebinarFollowupDrafts(webinarId: string, input: DraftInput) {
  const context = await ownerContext();
  const { businessId, supabase } = context;
  const { data: webinar, error: webinarError } = await supabase.from("webinars").select("id,version")
    .eq("business_id", businessId).eq("id", webinarId).maybeSingle();
  if (webinarError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not load webinar.");
  if (!webinar) throw new WebinarFollowupError("NOT_FOUND", "Webinar not found.");
  if (input.expected_version !== undefined && webinar.version !== input.expected_version) throw new WebinarFollowupError("CONFLICT", "This webinar changed. Reload before saving follow-ups.");

  const { data: existing } = await supabase.from("webinar_followups").select("approval_version")
    .eq("business_id", businessId).eq("webinar_id", webinarId).maybeSingle();
  const { error: approvalError } = await supabase.from("webinar_followups").upsert({
    business_id: businessId, webinar_id: webinarId, enabled: input.enabled,
    status: input.enabled ? "draft" : "disabled", scheduled_for: null,
    approval_version: (existing?.approval_version ?? 0) + 1, eligibility_version: null,
    recipient_snapshot: [], snapshot_hash: null, approved_at: null, last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "business_id,webinar_id" });
  if (approvalError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not invalidate the previous follow-up approval.");

  for (const [kind, subject, content] of [
    ["attendee", input.attendee_subject, input.attendee_body],
    ["no_show", input.no_show_subject, input.no_show_body],
  ] as const) {
    const { error } = await supabase.from("marketing_campaigns").upsert({
      business_id: businessId,
      webinar_id: webinarId,
      webinar_followup_kind: kind,
      title: `${kind === "attendee" ? "Attendee" : "No-show"} follow-up: ${webinarId}`,
      subject,
      content,
      status: "DRAFT",
      audience_filter: { webinar_id: webinarId, audience: kind },
      scheduled_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id,webinar_id,webinar_followup_kind" });
    if (error) throw new WebinarFollowupError("DATABASE_ERROR", "Could not save the reviewed follow-up drafts.");
  }
  await cancelPendingFollowupJobs(supabase, businessId, webinarId);
  const { data: savedWebinar, error: sessionError } = await supabase.from("webinars").update({ followup_enabled: input.enabled })
    .eq("business_id", businessId).eq("id", webinarId).eq("version", webinar.version).select("id").maybeSingle();
  if (sessionError || !savedWebinar) throw new WebinarFollowupError("CONFLICT", "Webinar settings changed. Reload before saving.");

  await recordWebinarAudit(context, {
    action: "webinar.followup.updated", resourceType: "webinar", resourceId: webinarId,
    metadata: { webinar_id: webinarId, enabled: input.enabled, version: webinar.version + 1 },
  });
  return getWebinarFollowup(webinarId);
}

export async function scheduleWebinarFollowup(webinarId: string, input: ScheduleInput) {
  const context = await ownerContext();
  const { businessId, supabase, user } = context;
  let sendFrom: string;
  try { sendFrom = await getGoogleEmailSenderForBusiness(businessId); }
  catch (error) {
    const reconnectRequired = error instanceof GoogleTokenVaultError
      && (error.code === "NOT_CONNECTED" || error.code === "RECONNECT_REQUIRED");
    throw new WebinarFollowupError("CONFIGURATION_ERROR", reconnectRequired
      ? "Reconnect Google and grant Gmail send permission before scheduling follow-ups."
      : "Google email authorization is temporarily unavailable.");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) throw new WebinarFollowupError("CONFIGURATION_ERROR", "The public app URL is not configured.");
  const publicUrl = new URL(appUrl);
  if (publicUrl.protocol !== "https:" && publicUrl.hostname !== "localhost") throw new WebinarFollowupError("CONFIGURATION_ERROR", "Public app URL must use HTTPS.");

  const { data: webinar, error: webinarError } = await supabase.from("webinars")
    .select("id,title,status,version,scheduled_start,duration_minutes,timezone,followup_enabled,product_url,business_id")
    .eq("business_id", businessId).eq("id", webinarId).maybeSingle();
  if (webinarError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not load webinar.");
  if (!webinar) throw new WebinarFollowupError("NOT_FOUND", "Webinar not found.");
  if (!webinar.followup_enabled) throw new WebinarFollowupError("BLOCKED", "Enable the optional follow-up service before scheduling messages.");
  if (webinar.status === "cancelled") throw new WebinarFollowupError("BLOCKED", "Cancelled webinars cannot send follow-ups.");
  if (!webinar.scheduled_start || new Date(webinar.scheduled_start).getTime() + webinar.duration_minutes * 60000 > Date.now()) throw new WebinarFollowupError("BLOCKED", "The webinar must end before its follow-up can be scheduled.");
  if (webinar.version !== input.expected_version) throw new WebinarFollowupError("CONFLICT", "Webinar settings changed. Review the follow-up again.");
  const scheduleAt = new Date(input.scheduled_for);
  if (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() <= Date.now()) throw new WebinarFollowupError("BLOCKED", "Choose a future follow-up delivery time.");

  const [{ data: importState, error: importError }, { data: conferences, error: conferenceError }, { data: participants, error: participantError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("webinar_attendance_imports").select("status,eligibility_version,unresolved_count")
      .eq("business_id", businessId).eq("webinar_id", webinarId).maybeSingle(),
    supabase.from("webinar_conferences").select("id,ended_at")
      .eq("business_id", businessId).eq("webinar_id", webinarId),
    supabase.from("webinar_participants").select("registration_id,review_disposition")
      .eq("business_id", businessId).eq("webinar_id", webinarId),
    supabase.from("webinar_registration_sessions").select("registration_id")
      .eq("business_id", businessId).eq("webinar_id", webinarId),
  ]);
  if (importError || conferenceError || participantError || linksError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not verify webinar attendance.");
  if (!importState || importState.status !== "complete" || (importState.unresolved_count ?? 0) > 0 || !conferences?.length || conferences.some((conference) => !conference.ended_at || new Date(conference.ended_at).getTime() > Date.now())) {
    throw new WebinarFollowupError("BLOCKED", "Follow-ups require ended Meet conferences, a complete attendance import, and resolved participant reviews.");
  }

  const ids = [...new Set((links ?? []).map((link) => link.registration_id))];
  const [{ data: registrations, error: registrationError }, { data: previousFeedback, error: feedbackError }] = await Promise.all([
    supabase.from("webinar_registrations").select("id,email,full_name")
      .eq("business_id", businessId).in("id", ids),
    supabase.from("webinar_feedback").select("registration_id,submitted_at")
      .eq("business_id", businessId).eq("webinar_id", webinarId),
  ]);
  if (registrationError || feedbackError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not prepare the follow-up audience.");
  const feedbackSubmitted = new Set((previousFeedback ?? []).filter((row) => row.submitted_at).map((row) => row.registration_id));
  const attendedIds = new Set((participants ?? []).filter((participant) => participant.review_disposition === "matched" && participant.registration_id).map((participant) => participant.registration_id));
  const snapshot = (registrations ?? []).filter((registration) => !feedbackSubmitted.has(registration.id)).map((registration) => ({
    registration_id: registration.id,
    email: registration.email,
    full_name: registration.full_name,
    audience: attendedIds.has(registration.id) ? "attendee" as const : "no_show" as const,
  }));
  if (snapshot.length !== input.expected_recipient_count) throw new WebinarFollowupError("CONFLICT", "The follow-up recipient list changed. Review the updated audience before scheduling.");

  const [attendeeCampaign, noShowCampaign] = await Promise.all([
    campaignForKind(supabase, businessId, webinarId, "attendee"),
    campaignForKind(supabase, businessId, webinarId, "no_show"),
  ]);
  if (!attendeeCampaign || !noShowCampaign) throw new WebinarFollowupError("BLOCKED", "Save both attendee and no-show follow-up drafts before scheduling.");
  const { data: existing } = await supabase.from("webinar_followups").select("approval_version")
    .eq("business_id", businessId).eq("webinar_id", webinarId).maybeSingle();
  const approvalVersion = (existing?.approval_version ?? 0) + 1;
  const snapshotHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

  const { error: approvalError } = await supabase.from("webinar_followups").upsert({
    business_id: businessId, webinar_id: webinarId, enabled: true, status: "scheduled",
    scheduled_for: scheduleAt.toISOString(), approval_version: approvalVersion,
    eligibility_version: importState.eligibility_version, recipient_snapshot: snapshot,
    snapshot_hash: snapshotHash, approved_at: new Date().toISOString(),
    attendee_campaign_id: attendeeCampaign.id, no_show_campaign_id: noShowCampaign.id,
    last_error: null, updated_at: new Date().toISOString(),
  }, { onConflict: "business_id,webinar_id" });
  if (approvalError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not save follow-up approval.");

  for (const recipient of snapshot) {
    const isAttendee = recipient.audience === "attendee";
    const campaign = isAttendee ? attendeeCampaign : noShowCampaign;
    let htmlBody = `<p>Hi ${escapeHtml(recipient.full_name)},</p><p>${escapeHtml(String(campaign.content))}</p>`;
    let textBody = `Hi ${recipient.full_name},\n\n${campaign.content}`;
    if (isAttendee) {
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const { error: feedbackInsertError } = await supabase.from("webinar_feedback").upsert({
        business_id: businessId,
        registration_id: recipient.registration_id,
        webinar_id: webinarId,
        token_hash: tokenHash,
      }, { onConflict: "business_id,registration_id,webinar_id" });
      if (feedbackInsertError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not create a participant feedback link.");
      const feedbackUrl = new URL(`/webinar-feedback/${rawToken}`, publicUrl).toString();
      htmlBody += `<p><a href="${escapeHtml(feedbackUrl)}">Share your feedback</a></p>`;
      textBody += `\n\nShare your feedback: ${feedbackUrl}`;
    }
    if (webinar.product_url) {
      htmlBody += `<p><a href="${escapeHtml(webinar.product_url)}">Learn more about this product</a></p>`;
      textBody += `\n\nLearn more: ${webinar.product_url}`;
    }
    const { error: enqueueError } = await supabase.rpc("enqueue_webinar_email", {
      p_business_id: businessId,
      p_webinar_id: webinarId,
      p_kind: isAttendee ? "followup_attendee" : "followup_no_show",
      p_effect_key: `followup/${webinarId}/${approvalVersion}/${recipient.registration_id}`,
      p_to_email: recipient.email,
      p_from_email: sendFrom,
      p_reply_to_email: sendFrom,
      p_subject: String(campaign.subject),
      p_html_body: htmlBody,
      p_text_body: textBody,
      p_payload: { registration_id: recipient.registration_id, approval_version: approvalVersion, eligibility_version: importState.eligibility_version, audience: recipient.audience, snapshot_hash: snapshotHash },
      p_scheduled_for: scheduleAt.toISOString(),
      p_max_attempts: 5,
    });
    if (enqueueError) throw new WebinarFollowupError("DATABASE_ERROR", "Could not queue approved follow-up messages.");
  }

  for (const campaign of [attendeeCampaign, noShowCampaign]) {
    await supabase.from("marketing_campaigns").update({ status: "SCHEDULED", scheduled_at: scheduleAt.toISOString() })
      .eq("business_id", businessId).eq("id", campaign.id);
  }
  await recordWebinarAudit(context, {
    action: "webinar.followup.scheduled", resourceType: "webinar", resourceId: webinarId,
    approver: { id: user.id, type: "user", approved_at: new Date().toISOString() },
    metadata: { webinar_id: webinarId, version: approvalVersion, recipient_count: snapshot.length },
  });
  await recordWebinarAudit(context, {
    action: "webinar.notification.queued", resourceType: "webinar", resourceId: webinarId,
    metadata: { webinar_id: webinarId, operation_id: `followup/${webinarId}/${approvalVersion}`, recipient_count: snapshot.length, notification_type: "followup" },
  });
  return { status: "scheduled" as const, recipients: snapshot.length, scheduled_for: scheduleAt.toISOString(), approval_version: approvalVersion };
}
