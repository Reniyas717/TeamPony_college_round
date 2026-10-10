import { z } from "zod";

export const WebinarWorkRequestSchema = z.object({
  batch_size: z.coerce.number().int().min(1).max(50).default(25),
}).strict();

export type WebinarWorkRequest = z.infer<typeof WebinarWorkRequestSchema>;
