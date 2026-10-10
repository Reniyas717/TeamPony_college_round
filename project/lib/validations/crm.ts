import { z } from "zod";

/**
 * CRM Validation Schemas & Types
 * Enforces boundary validation per AGENTS.md §6.1
 */

export const ContactStageSchema = z.enum([
  "lead",
  "contacted",
  "qualified",
  "proposal",
  "customer",
  "churned",
]);

export const ContactSourceSchema = z.enum([
  "website_form",
  "webinar",
  "manual",
  "referral",
]);

export const ActivityTypeSchema = z.enum([
  "form_submission",
  "stage_change",
  "note",
  "email_sent",
  "ai_agent_action",
]);

export const ActivityActorSchema = z.enum([
  "owner",
  "system",
  "ai_agent",
]);

export const CreateContactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().optional().or(z.literal("")),
  company: z.string().trim().optional().or(z.literal("")),
  stage: ContactStageSchema.default("lead"),
  value: z.coerce.number().int().nonnegative().default(0),
  source: ContactSourceSchema.default("manual"),
  tags: z.array(z.string().trim()).default([]),
  next_action_text: z.string().trim().optional().or(z.literal("")),
  next_action_due_at: z.string().datetime().optional().nullable().or(z.literal("")),
});

export const UpdateContactSchema = CreateContactSchema.partial();

export const ContactFiltersSchema = z.object({
  search: z.string().trim().optional(),
  stage: ContactStageSchema.optional(),
  source: ContactSourceSchema.optional(),
  tag: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ContactStage = z.infer<typeof ContactStageSchema>;
export type ContactSource = z.infer<typeof ContactSourceSchema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type ActivityActor = z.infer<typeof ActivityActorSchema>;
export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
export type ContactFilters = z.infer<typeof ContactFiltersSchema>;

export interface Contact {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  stage: ContactStage;
  value: number; // In INR or base currency
  source: ContactSource;
  tags: string[];
  next_action_text?: string | null;
  next_action_due_at?: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  business_id: string;
  contact_id: string;
  type: ActivityType;
  title: string;
  description?: string | null;
  actor: ActivityActor;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CrmStats {
  totalContacts: number;
  totalPipelineValue: number;
  stageCounts: Record<ContactStage, number>;
  stageValues: Record<ContactStage, number>;
  conversionRate: {
    qualifiedOfTotal: { count: number; total: number; percentage: number };
    customersOfTotal: { count: number; total: number; percentage: number };
  };
}
