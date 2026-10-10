import { z } from "zod";

// 32 random bytes encoded as unpadded base64url: 43 characters.
export const WebinarFeedbackTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid feedback link.");

export const PublicWebinarFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  was_useful: z.boolean(),
  comments: z.string().trim().max(2000).nullable().optional().transform((value) => value || null),
  product_interest: z.boolean().default(false),
  marketing_opt_in: z.boolean().default(false),
});

export type PublicWebinarFeedback = z.infer<typeof PublicWebinarFeedbackSchema>;
