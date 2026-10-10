import { z } from "zod";

const publicSlug = z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/);

export const PublicWebinarRegistrationSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(180, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(320).transform((value) => value.toLowerCase()),
  selected_session_slugs: z.array(publicSlug).max(100).optional(),
  marketing_opt_in: z.boolean().default(false),
});

export const PublicWebinarSlugSchema = publicSlug;

export type PublicWebinarRegistration = z.infer<typeof PublicWebinarRegistrationSchema>;
