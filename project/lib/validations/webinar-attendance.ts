import { z } from "zod";

export const AttendanceImportSchema = z.object({
  max_pages: z.coerce.number().int().min(1).max(50).default(10),
}).strict();

export const AttendanceReviewSchema = z.object({
  disposition: z.enum(["unresolved", "matched", "host", "unregistered"]),
  registration_id: z.string().uuid().nullable().optional(),
}).superRefine((value, context) => {
  if (value.disposition === "matched" && !value.registration_id) {
    context.addIssue({
      code: "custom",
      path: ["registration_id"],
      message: "A matched participant needs a registration.",
    });
  }
  if (value.disposition !== "matched" && value.registration_id) {
    context.addIssue({
      code: "custom",
      path: ["registration_id"],
      message: "Only matched participants may reference a registration.",
    });
  }
});

export type AttendanceImportInput = z.infer<typeof AttendanceImportSchema>;
export type AttendanceReviewInput = z.infer<typeof AttendanceReviewSchema>;
