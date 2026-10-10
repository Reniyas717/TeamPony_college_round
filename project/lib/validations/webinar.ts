import { z } from "zod";

const timezone = z.string().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
  catch { return false; }
}, "Use a valid IANA timezone");

export const WebinarInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  presenter: z.string().trim().max(180).nullable().optional(),
  scheduled_start: z.string().datetime({ offset: true }).nullable().optional(),
  timezone,
  duration_minutes: z.number().int().min(5).max(720).default(60),
  capacity: z.number().int().positive().max(100000).nullable().optional(),
  registration_closes_at: z.string().datetime({ offset: true }).nullable().optional(),
  followup_enabled: z.boolean().default(false),
  product_url: z.string().url().refine((value) => new URL(value).protocol === "https:", "Product URL must use HTTPS").nullable().optional(),
  series_id: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
  expected_version: z.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (value.registration_closes_at && value.scheduled_start && Date.parse(value.registration_closes_at) > Date.parse(value.scheduled_start)) {
    context.addIssue({ code: "custom", path: ["registration_closes_at"], message: "Registration must close by the session start" });
  }
  if (value.status === "scheduled" && !value.scheduled_start) {
    context.addIssue({ code: "custom", path: ["scheduled_start"], message: "A scheduled webinar needs a start time" });
  }
});

export const DeleteWebinarSchema = z.object({ confirmation: z.literal("DELETE"), expected_version: z.number().int().positive() });
export const WebinarActionSchema = z.object({
  expected_version: z.number().int().positive().optional(),
  expected_recipient_count: z.number().int().nonnegative().optional(),
  action: z.enum(["save_drafts", "request_approval", "schedule", "cancel", "followup"]).optional(),
  enabled: z.boolean().optional(),
  attendee_subject: z.string().trim().max(200).optional(),
  attendee_body: z.string().trim().max(10000).optional(),
  no_show_subject: z.string().trim().max(200).optional(),
  no_show_body: z.string().trim().max(10000).optional(),
}).strict();

export const WebinarRescheduleSchema = WebinarInputSchema.extend({
  action: z.literal("reschedule"),
  expected_version: z.number().int().positive(),
  expected_recipient_count: z.number().int().nonnegative(),
  expected_recipient_snapshot_hash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export type WebinarInput = z.infer<typeof WebinarInputSchema>;
