import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { WebinarInput } from "@/lib/validations/webinar";
import { createGoogleMeetSpace, MeetApiError } from "./google-meet.service";
import { queueCancellationNotifications, queueRescheduleNotifications } from "./event-notification.service";

export class WebinarServiceError extends Error {
  constructor(public code: "UNAUTHORIZED" | "NOT_FOUND" | "DATABASE_ERROR" | "INTEGRATION_REQUIRED" | "CONFLICT", message: string) {
    super(message);
  }
}

async function ownerContext() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new WebinarServiceError("UNAUTHORIZED", "Sign in to manage webinars.");

  const { data: business, error } = await supabase
    .from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (error || !business) throw new WebinarServiceError("NOT_FOUND", "Business workspace not found.");
  return { supabase, businessId: business.id };
}

async function webinarRegistrationSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string, webinarId: string) {
  const ids: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("webinar_registration_sessions").select("registration_id")
      .eq("business_id", businessId).eq("webinar_id", webinarId)
      .order("registration_id", { ascending: true }).range(offset, offset + 999);
    if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not verify registered attendees.");
    ids.push(...(data ?? []).map((row) => row.registration_id));
    if (!data || data.length < 1000) break;
  }
  return [...new Set(ids)].sort();
}

export async function listWebinars() {
  const { supabase, businessId } = await ownerContext();
  const { data, error } = await supabase.from("webinars").select("*")
    .eq("business_id", businessId).order("scheduled_start", { ascending: true, nullsFirst: true });
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinars.");
  return data ?? [];
}

export async function getWebinar(id: string) {
  const { supabase, businessId } = await ownerContext();
  const { data, error } = await supabase.from("webinars").select("*")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar.");
  if (!data) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  const [links, importResult, participantsResult, feedbackResult, followupResult, attendeeCampaign, noShowCampaign] = await Promise.all([
    supabase.from("webinar_registration_sessions").select("registration_id,created_at")
      .eq("business_id", businessId).eq("webinar_id", id),
    supabase.from("webinar_attendance_imports").select("status,last_successful_sync_at,unresolved_count")
      .eq("business_id", businessId).eq("webinar_id", id).maybeSingle(),
    supabase.from("webinar_participants").select("registration_id,review_disposition")
      .eq("business_id", businessId).eq("webinar_id", id),
    supabase.from("webinar_feedback").select("registration_id,rating,was_useful,comments,product_interest,marketing_opt_in,submitted_at")
      .eq("business_id", businessId).eq("webinar_id", id),
    supabase.from("webinar_followups").select("enabled,status,scheduled_for,last_error")
      .eq("business_id", businessId).eq("webinar_id", id).maybeSingle(),
    supabase.from("marketing_campaigns").select("subject,content,webinar_followup_kind")
      .eq("business_id", businessId).eq("webinar_id", id).eq("webinar_followup_kind", "attendee").maybeSingle(),
    supabase.from("marketing_campaigns").select("subject,content,webinar_followup_kind")
      .eq("business_id", businessId).eq("webinar_id", id).eq("webinar_followup_kind", "no_show").maybeSingle(),
  ]);
  if ([links, importResult, participantsResult, feedbackResult, followupResult, attendeeCampaign, noShowCampaign].some((result) => result.error)) {
    throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar outcome data.");
  }
  const registrationIds = [...new Set((links.data ?? []).map((row) => row.registration_id))];
  const registrationsResult = registrationIds.length
    ? await supabase.from("webinar_registrations").select("id,full_name,email,created_at")
      .eq("business_id", businessId).in("id", registrationIds)
    : { data: [], error: null };
  if (registrationsResult.error) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar registrations.");
  const feedback = feedbackResult.data ?? [];
  const submitted = feedback.filter((row) => row.submitted_at);
  const registrationNames = new Map((registrationsResult.data ?? []).map((row) => [row.id, row.full_name]));
  const importState = importResult.data;
  const participants = participantsResult.data ?? [];
  const attendedIds = new Set(participants.filter((row) => row.review_disposition === "matched" && row.registration_id).map((row) => row.registration_id));
  const ended = Boolean(data.scheduled_start && Date.parse(data.scheduled_start) + data.duration_minutes * 60000 <= Date.now());
  const attendanceComplete = importState?.status === "complete" && !(importState.unresolved_count ?? 0) && ended;
  return {
    ...data,
    registrations: (registrationsResult.data ?? []).map((row) => ({
      id: row.id, name: row.full_name, email: row.email, registered_at: row.created_at, status: "registered",
    })),
    attendance: {
      importStatus: importState?.status ?? "pending",
      lastSyncedAt: importState?.last_successful_sync_at ?? null,
      registeredCount: registrationIds.length,
      participantCount: participants.length,
      attendedCount: attendanceComplete ? attendedIds.size : null,
      noShowCount: attendanceComplete ? Math.max(0, registrationIds.length - attendedIds.size) : null,
      reviewStatus: attendanceComplete ? "resolved" : "unresolved",
    },
    followup: {
      enabled: followupResult.data?.enabled ?? data.followup_enabled,
      status: followupResult.data?.status ?? (data.followup_enabled ? "draft" : "disabled"),
      scheduledFor: followupResult.data?.scheduled_for ?? null,
      blockedReason: followupResult.data?.last_error ?? null,
      attendeeSubject: attendeeCampaign.data?.subject ?? null,
      attendeeBody: attendeeCampaign.data?.content ?? null,
      noShowSubject: noShowCampaign.data?.subject ?? null,
      noShowBody: noShowCampaign.data?.content ?? null,
    },
    feedback: {
      responseCount: submitted.length,
      eligibleCount: attendanceComplete ? attendedIds.size : null,
      averageRating: submitted.length ? submitted.reduce((sum, row) => sum + (row.rating ?? 0), 0) / submitted.filter((row) => row.rating != null).length || null : null,
      helpfulCount: submitted.filter((row) => row.was_useful === true).length,
      productInterestCount: submitted.filter((row) => row.product_interest).length,
      responses: submitted.map((row) => ({
        registrationId: row.registration_id,
        name: registrationNames.get(row.registration_id) ?? "Attendee",
        rating: row.rating,
        wasUseful: row.was_useful,
        comments: row.comments,
        productInterest: row.product_interest,
        marketingOptIn: row.marketing_opt_in,
        submittedAt: row.submitted_at,
      })),
    },
  };
}

export async function createWebinar(input: WebinarInput) {
  if (input.status === "scheduled") throw new WebinarServiceError("INTEGRATION_REQUIRED", "Connect the existing Google Meet integration before scheduling.");
  const { supabase, businessId } = await ownerContext();
  const { data, error } = await supabase.from("webinars").insert({
    business_id: businessId, title: input.title, description: input.description ?? null,
    public_slug: randomUUID(),
    presenter: input.presenter ?? null, scheduled_start: input.scheduled_start ?? null,
    timezone: input.timezone, duration_minutes: input.duration_minutes,
    capacity: input.capacity ?? null, registration_closes_at: input.registration_closes_at ?? null,
    followup_enabled: input.followup_enabled, product_url: input.product_url ?? null,
    series_id: input.series_id ?? null, status: input.status ?? "draft",
  }).select("*").single();
  if (error || !data) throw new WebinarServiceError("DATABASE_ERROR", "Could not create webinar.");
  return data;
}

export async function updateWebinar(id: string, input: WebinarInput) {
  const { supabase, businessId } = await ownerContext();
  const { data: current, error: readError } = await supabase.from("webinars").select("*")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (readError) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar.");
  if (!current) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  if (input.expected_version !== undefined && current.version !== input.expected_version) throw new WebinarServiceError("CONFLICT", "This webinar changed. Reload it before saving.");
  if (input.status === "scheduled" && current.status !== "scheduled") throw new WebinarServiceError("INTEGRATION_REQUIRED", "Connect the existing Google Meet integration before scheduling.");
  if (current.status === "scheduled" && input.status && input.status !== "scheduled") throw new WebinarServiceError("CONFLICT", "Use the reviewed cancellation flow to change a scheduled webinar.");
  if (current.status === "scheduled" && input.scheduled_start !== undefined && input.scheduled_start !== current.scheduled_start) throw new WebinarServiceError("INTEGRATION_REQUIRED", "Rescheduling requires an attendee review and notification workflow.");
  let update = supabase.from("webinars").update({
    title: input.title, description: input.description ?? null,
    presenter: input.presenter ?? null, scheduled_start: input.scheduled_start === undefined ? current.scheduled_start : input.scheduled_start,
    timezone: input.timezone, duration_minutes: input.duration_minutes,
    capacity: input.capacity ?? null, registration_closes_at: input.registration_closes_at ?? null,
    followup_enabled: input.followup_enabled, product_url: input.product_url ?? null,
    series_id: input.series_id ?? null, status: input.status ?? current.status,
  }).eq("business_id", businessId).eq("id", id);
  if (input.expected_version !== undefined) update = update.eq("version", input.expected_version);
  const { data, error } = await update.select("*").maybeSingle();
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not update webinar.");
  if (!data) throw new WebinarServiceError(input.expected_version !== undefined ? "CONFLICT" : "NOT_FOUND", input.expected_version !== undefined ? "This webinar changed. Reload it before saving." : "Webinar not found.");
  return data;
}

export async function deleteWebinar(id: string, confirmed: boolean, expectedVersion?: number) {
  if (!confirmed) throw new WebinarServiceError("CONFLICT", "Explicit deletion confirmation is required.");
  const { supabase, businessId } = await ownerContext();
  const preview = await getWebinarDeletePreview(id);
  if (expectedVersion !== undefined && preview.version !== expectedVersion) throw new WebinarServiceError("CONFLICT", "This webinar changed. Review deletion details again.");
  if (preview.active_delivery_count > 0 || preview.unknown_delivery_count > 0 || preview.meet_operation_count > 0) throw new WebinarServiceError("CONFLICT", "Meet or email work is in progress or has an unknown provider outcome. Reconcile it before deletion.");
  let deletion = supabase.from("webinars").delete().eq("business_id", businessId).eq("id", id);
  if (expectedVersion !== undefined) deletion = deletion.eq("version", expectedVersion);
  const { data, error } = await deletion.select("id").maybeSingle();
  if (error?.code === "40001") throw new WebinarServiceError("CONFLICT", "Email delivery started while deletion was being confirmed. Reconcile it before retrying.");
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not delete webinar.");
  if (!data) throw new WebinarServiceError(expectedVersion !== undefined ? "CONFLICT" : "NOT_FOUND", expectedVersion !== undefined ? "This webinar changed. Reload it before deleting." : "Webinar not found.");
}

export async function getWebinarDeletePreview(id: string) {
  const { supabase, businessId } = await ownerContext();
  const { data: webinar, error: webinarError } = await supabase.from("webinars").select("id,title,status,version,series_id,provisioning_status")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (webinarError) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar deletion preview.");
  if (!webinar) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  const tables = [
    ["registrations", supabase.from("webinar_registration_sessions").select("registration_id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", id)],
    ["participants", supabase.from("webinar_participants").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", id)],
    ["join_sessions", supabase.from("webinar_participant_sessions").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", id)],
    ["feedback", supabase.from("webinar_feedback").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", id)],
    ["campaigns", supabase.from("marketing_campaigns").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", id)],
    ["active_delivery", supabase.from("webinar_email_outbox").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", id).eq("status", "processing")],
    ["unknown_delivery", supabase.from("webinar_email_outbox").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", id).eq("status", "unknown")],
  ] as const;
  const results = await Promise.all(tables.map(([, query]) => query));
  if (results.some((result) => result.error)) throw new WebinarServiceError("DATABASE_ERROR", "Could not count webinar records for deletion.");
  const counts = Object.fromEntries(tables.map(([name], index) => [name, results[index].count ?? 0]));
  const meetOperationCount = webinar.provisioning_status === "provisioning" || webinar.provisioning_status === "unknown" ? 1 : 0;
  return { ...webinar, counts, active_delivery_count: counts.active_delivery, unknown_delivery_count: counts.unknown_delivery, meet_operation_count: meetOperationCount };
}

export async function scheduleWebinar(id: string, expectedVersion: number) {
  const { supabase, businessId } = await ownerContext();
  const { data: current, error: readError } = await supabase.from("webinars").select("*")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (readError) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar.");
  if (!current) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  if (current.version !== expectedVersion) throw new WebinarServiceError("CONFLICT", "This webinar changed. Reload it before scheduling.");
  if (current.status === "scheduled" && current.meeting_uri) return current;
  if (current.status !== "draft" || !current.scheduled_start) {
    throw new WebinarServiceError("CONFLICT", "Save a draft start time before scheduling.");
  }
  if (current.provisioning_status === "unknown" || current.provisioning_status === "provisioning") {
    throw new WebinarServiceError("CONFLICT", "Meet space creation needs reconciliation before another attempt.");
  }

  const { data: reserved, error: reserveError } = await supabase.from("webinars")
    .update({ provisioning_status: "provisioning" })
    .eq("business_id", businessId)
    .eq("id", id)
    .eq("version", expectedVersion)
    .eq("status", "draft")
    .select("*")
    .maybeSingle();
  if (reserveError || !reserved) throw new WebinarServiceError("CONFLICT", "This webinar changed. Reload it before scheduling.");

  let space: Awaited<ReturnType<typeof createGoogleMeetSpace>>;
  try {
    space = await createGoogleMeetSpace(businessId);
  } catch (error) {
    const apiError = error instanceof MeetApiError ? error : new MeetApiError("unknown", "Meet space creation outcome is unknown; review before retrying.");
    await supabase.from("webinars").update({
      provisioning_status: apiError.outcome === "unknown" ? "unknown" : apiError.outcome === "reconnect" ? "reconnect_required" : "failed",
    }).eq("business_id", businessId).eq("id", id).eq("version", reserved.version);
    throw new WebinarServiceError(apiError.outcome === "reconnect" ? "INTEGRATION_REQUIRED" : apiError.outcome === "unknown" ? "CONFLICT" : "DATABASE_ERROR", apiError.message);
  }

  const { data, error } = await supabase.from("webinars").update({
    meet_space_name: space.name,
    meeting_uri: space.meetingUri,
    provisioning_status: "ready",
    status: "scheduled",
  }).eq("business_id", businessId).eq("id", id).eq("version", reserved.version).select("*").maybeSingle();
  if (error || !data) {
    await supabase.from("webinars").update({ provisioning_status: "unknown" })
      .eq("business_id", businessId).eq("id", id);
    throw new WebinarServiceError("CONFLICT", "Meet was created but could not be safely linked. Review the existing space before retrying.");
  }
  return data;
}

export async function getWebinarCancellationPreview(id: string) {
  const { supabase, businessId } = await ownerContext();
  const { data: webinar, error: webinarError } = await supabase.from("webinars")
    .select("id,title,status,version,scheduled_start,timezone")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (webinarError) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar.");
  if (!webinar) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  if (!["scheduled", "live"].includes(webinar.status)) throw new WebinarServiceError("CONFLICT", "Only a scheduled or live webinar can be cancelled.");
  const { count, error } = await supabase.from("webinar_registration_sessions")
    .select("registration_id", { count: "exact", head: true })
    .eq("business_id", businessId).eq("webinar_id", id);
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not count registered attendees.");
  return { ...webinar, recipient_count: count ?? 0 };
}

export async function getWebinarReschedulePreview(id: string) {
  const { supabase, businessId } = await ownerContext();
  const { data: webinar, error } = await supabase.from("webinars")
    .select("id,title,status,version,scheduled_start,timezone")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar.");
  if (!webinar) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  if (webinar.status !== "scheduled") throw new WebinarServiceError("CONFLICT", "Only a scheduled webinar can be rescheduled.");
  const ids = await webinarRegistrationSnapshot(supabase, businessId, id);
  const recipientSnapshotHash = createHash("sha256").update(JSON.stringify(ids)).digest("hex");
  return { ...webinar, recipient_count: ids.length, recipient_snapshot_hash: recipientSnapshotHash };
}

export async function rescheduleWebinar(id: string, input: WebinarInput, expectedRecipientCount: number, expectedRecipientSnapshotHash: string) {
  const { supabase, businessId } = await ownerContext();
  const { data: current, error: readError } = await supabase.from("webinars").select("*")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (readError) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar.");
  if (!current) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  if (current.version !== input.expected_version) throw new WebinarServiceError("CONFLICT", "This webinar changed. Review the reschedule again.");
  if (current.status !== "scheduled") throw new WebinarServiceError("CONFLICT", "Only a scheduled webinar can be rescheduled.");
  if (!input.scheduled_start || Date.parse(input.scheduled_start) <= Date.now()) throw new WebinarServiceError("CONFLICT", "Choose a future start time.");
  const ids = await webinarRegistrationSnapshot(supabase, businessId, id);
  if (ids.length !== expectedRecipientCount) throw new WebinarServiceError("CONFLICT", "The attendee list changed. Review the updated reschedule preview.");
  const actualSnapshotHash = createHash("sha256").update(JSON.stringify(ids)).digest("hex");
  if (actualSnapshotHash !== expectedRecipientSnapshotHash) throw new WebinarServiceError("CONFLICT", "The attendee list changed. Review the updated reschedule preview.");

  const { data: updated, error } = await supabase.from("webinars").update({
    title: input.title, description: input.description ?? null, presenter: input.presenter ?? null,
    scheduled_start: input.scheduled_start, timezone: input.timezone,
    duration_minutes: input.duration_minutes, capacity: input.capacity ?? null,
    registration_closes_at: input.registration_closes_at ?? null,
    followup_enabled: input.followup_enabled, product_url: input.product_url ?? null,
    series_id: input.series_id ?? null,
  }).eq("business_id", businessId).eq("id", id).eq("version", input.expected_version)
    .eq("status", "scheduled").select("*").maybeSingle();
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not reschedule webinar.");
  if (!updated) throw new WebinarServiceError("CONFLICT", "This webinar changed. Review the reschedule again.");

  const admin = createAdminClient();
  const { data: followup } = await admin.from("webinar_followups").select("approval_version")
    .eq("business_id", businessId).eq("webinar_id", id).maybeSingle();
  if (followup) {
    await admin.from("webinar_followups").update({
      status: updated.followup_enabled ? "draft" : "disabled", scheduled_for: null,
      approval_version: followup.approval_version + 1, eligibility_version: null,
      recipient_snapshot: [], snapshot_hash: null, approved_at: null,
      last_error: "The session was rescheduled; review attendance and schedule follow-up again.",
    }).eq("business_id", businessId).eq("webinar_id", id);
    await admin.from("webinar_email_outbox").update({ status: "cancelled", lease_owner: null, lease_expires_at: null,
      last_error: "The session was rescheduled before follow-up delivery." })
      .eq("business_id", businessId).eq("webinar_id", id)
      .in("kind", ["followup_attendee", "followup_no_show"]).in("status", ["queued", "processing"]);
  }
  const notifications = await queueRescheduleNotifications({
    businessId, webinarId: id, version: updated.version, title: updated.title,
    start: updated.scheduled_start, timezone: updated.timezone,
  });
  return { webinar: updated, notifications };
}

export async function cancelWebinar(id: string, expectedVersion: number, expectedRecipientCount: number) {
  const { supabase, businessId } = await ownerContext();
  const { data: current, error: readError } = await supabase.from("webinars").select("*")
    .eq("business_id", businessId).eq("id", id).maybeSingle();
  if (readError) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar.");
  if (!current) throw new WebinarServiceError("NOT_FOUND", "Webinar not found.");
  if (current.version !== expectedVersion) throw new WebinarServiceError("CONFLICT", "This webinar changed. Reload it before cancelling.");
  if (current.status === "cancelled") return { webinar: current, notifications: { status: "already_cancelled", recipients: 0, queued: 0 } };
  if (!["scheduled", "live"].includes(current.status)) throw new WebinarServiceError("CONFLICT", "Only a scheduled or live webinar can be cancelled.");

  const { count: actualRecipientCount, error: countError } = await supabase.from("webinar_registration_sessions")
    .select("registration_id", { count: "exact", head: true })
    .eq("business_id", businessId).eq("webinar_id", id);
  if (countError) throw new WebinarServiceError("DATABASE_ERROR", "Could not verify registered attendees.");
  if ((actualRecipientCount ?? 0) !== expectedRecipientCount) {
    throw new WebinarServiceError("CONFLICT", "The attendee list changed. Review the updated cancellation preview.");
  }

  const { data: cancelled, error } = await supabase.from("webinars").update({ status: "cancelled" })
    .eq("business_id", businessId).eq("id", id).eq("version", expectedVersion)
    .in("status", ["scheduled", "live"]).select("*").maybeSingle();
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not cancel webinar.");
  if (!cancelled) throw new WebinarServiceError("CONFLICT", "This webinar changed. Reload it before cancelling.");

  const notifications = await queueCancellationNotifications({
    businessId,
    webinarId: id,
    version: cancelled.version,
    title: cancelled.title,
    start: cancelled.scheduled_start,
    timezone: cancelled.timezone,
  });
  return { webinar: cancelled, notifications };
}
