import { z } from "zod";

export const WebinarSeriesSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
});

export const WebinarSeriesDeleteSchema = z.object({
  id: z.string().uuid(),
  confirmation: z.literal("DELETE"),
  expected_counts: z.object({
    sessions: z.number().int().nonnegative(),
    registrations: z.number().int().nonnegative(),
    participants: z.number().int().nonnegative(),
    join_sessions: z.number().int().nonnegative(),
    feedback: z.number().int().nonnegative(),
    campaigns: z.number().int().nonnegative(),
    active_delivery: z.number().int().nonnegative(),
    unknown_delivery: z.number().int().nonnegative(),
    meet_operations: z.number().int().nonnegative(),
  }),
});
