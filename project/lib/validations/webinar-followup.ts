import { z } from "zod";

export const WebinarFollowupDraftSchema = z.object({
  action: z.literal("save_drafts"),
  expected_version: z.number().int().positive().optional(),
  enabled: z.boolean(),
  attendee_subject: z.string().trim().min(1).max(200),
  attendee_body: z.string().trim().min(1).max(10000),
  no_show_subject: z.string().trim().min(1).max(200),
  no_show_body: z.string().trim().min(1).max(10000),
}).strict();

export const WebinarFollowupScheduleSchema = z.object({
  action: z.literal("request_approval"),
  scheduled_for: z.string().datetime({ offset: true }),
  expected_version: z.number().int().positive(),
  expected_recipient_count: z.number().int().nonnegative(),
}).strict();

export const WebinarFollowupActionSchema = z.discriminatedUnion("action", [
  WebinarFollowupDraftSchema,
  WebinarFollowupScheduleSchema,
]);
