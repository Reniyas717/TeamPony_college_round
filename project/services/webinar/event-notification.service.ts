import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export async function queueCancellationNotifications(input: {
  businessId: string;
  webinarId: string;
  version: number;
  title: string;
  start: string | null;
  timezone: string;
}) {
  const from = process.env.WEBINAR_EMAIL_FROM?.trim();
  if (!from) return { status: "not_configured" as const, recipients: 0, queued: 0 };

  const admin = createAdminClient();
  const { data: links, error: linksError } = await admin.from("webinar_registration_sessions")
    .select("registration_id").eq("business_id", input.businessId).eq("webinar_id", input.webinarId);
  if (linksError) return { status: "not_queued" as const, recipients: 0, queued: 0 };
  const ids = [...new Set((links ?? []).map((row) => row.registration_id))];
  if (!ids.length) return { status: "queued" as const, recipients: 0, queued: 0 };

  const [{ data: people, error: peopleError }, { data: business, error: businessError }] = await Promise.all([
    admin.from("webinar_registrations").select("id,email,full_name").eq("business_id", input.businessId).in("id", ids),
    admin.from("businesses").select("id,owner_id,name").eq("id", input.businessId).maybeSingle(),
  ]);
  if (peopleError || businessError || !business || !people) return { status: "not_queued" as const, recipients: ids.length, queued: 0 };
  const { data: profile } = await admin.from("profiles").select("email").eq("id", business.owner_id).maybeSingle();
  const time = input.start ? new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: input.timezone }).format(new Date(input.start)) : "Time to be announced";
  let queued = 0;
  for (const person of people) {
    const { error } = await admin.rpc("enqueue_webinar_email", {
      p_business_id: input.businessId,
      p_webinar_id: input.webinarId,
      p_kind: "cancellation_notification",
      p_effect_key: `event-cancellation/${input.webinarId}/${input.version}/${person.id}`,
      p_to_email: person.email,
      p_from_email: from,
      p_reply_to_email: profile?.email ?? null,
      p_subject: `Cancelled: ${input.title}`,
      p_html_body: `<p>Hi ${escapeHtml(person.full_name)},</p><p>${escapeHtml(business.name)} has cancelled <strong>${escapeHtml(input.title)}</strong>, scheduled for ${escapeHtml(time)} (${escapeHtml(input.timezone)}).</p><p>Please reply to this email if you have questions.</p>`,
      p_text_body: `Hi ${person.full_name},\n\n${business.name} has cancelled ${input.title}, scheduled for ${time} (${input.timezone}).\n\nPlease reply to this email if you have questions.`,
      p_payload: { webinar_id: input.webinarId },
      p_scheduled_for: new Date().toISOString(),
      p_max_attempts: 5,
    });
    if (error) return { status: queued ? "partially_queued" as const : "not_queued" as const, recipients: ids.length, queued };
    queued += 1;
  }
  return { status: "queued" as const, recipients: ids.length, queued };
}

export async function queueRescheduleNotifications(input: {
  businessId: string;
  webinarId: string;
  version: number;
  title: string;
  start: string;
  timezone: string;
}) {
  const from = process.env.WEBINAR_EMAIL_FROM?.trim();
  if (!from) return { status: "not_configured" as const, recipients: 0, queued: 0 };
  const admin = createAdminClient();
  const { data: links, error: linkError } = await admin.from("webinar_registration_sessions")
    .select("registration_id").eq("business_id", input.businessId).eq("webinar_id", input.webinarId);
  if (linkError) return { status: "not_queued" as const, recipients: 0, queued: 0 };
  const ids = [...new Set((links ?? []).map((row) => row.registration_id))];
  if (!ids.length) return { status: "queued" as const, recipients: 0, queued: 0 };
  const [{ data: people, error: peopleError }, { data: business, error: businessError }] = await Promise.all([
    admin.from("webinar_registrations").select("id,email,full_name").eq("business_id", input.businessId).in("id", ids),
    admin.from("businesses").select("owner_id,name").eq("id", input.businessId).maybeSingle(),
  ]);
  if (peopleError || businessError || !business || !people) return { status: "not_queued" as const, recipients: ids.length, queued: 0 };
  const { data: profile } = await admin.from("profiles").select("email").eq("id", business.owner_id).maybeSingle();
  const time = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: input.timezone }).format(new Date(input.start));
  let queued = 0;
  for (const person of people) {
    const { error } = await admin.rpc("enqueue_webinar_email", {
      p_business_id: input.businessId, p_webinar_id: input.webinarId,
      p_kind: "reschedule_notification",
      p_effect_key: `event-reschedule/${input.webinarId}/${input.version}/${person.id}`,
      p_to_email: person.email, p_from_email: from, p_reply_to_email: profile?.email ?? null,
      p_subject: `New time: ${input.title}`,
      p_html_body: `<p>Hi ${escapeHtml(person.full_name)},</p><p>${escapeHtml(business.name)} has rescheduled <strong>${escapeHtml(input.title)}</strong> to ${escapeHtml(time)} (${escapeHtml(input.timezone)}).</p><p>Your existing Google Meet link is unchanged.</p>`,
      p_text_body: `Hi ${person.full_name},\n\n${business.name} has rescheduled ${input.title} to ${time} (${input.timezone}). Your existing Google Meet link is unchanged.`,
      p_payload: { webinar_id: input.webinarId, scheduled_start: input.start, timezone: input.timezone },
      p_scheduled_for: new Date().toISOString(), p_max_attempts: 5,
    });
    if (error) return { status: queued ? "partially_queued" as const : "not_queued" as const, recipients: ids.length, queued };
    queued += 1;
  }
  return { status: "queued" as const, recipients: ids.length, queued };
}
