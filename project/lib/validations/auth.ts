import { z } from "zod";

export const SignUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and dashes"),
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

export const LoginSchema = z.object({
  // Allows login with either username or email
  identifier: z.string().min(1, "Please enter your username or email"),
  password: z.string().min(1, "Please enter your password"),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
