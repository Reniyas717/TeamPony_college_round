import { z } from "zod";

export const StageEmotionSchema = z.enum([
  "delighted",
  "positive",
  "neutral",
  "confused",
  "frustrated",
]);
export type StageEmotion = z.infer<typeof StageEmotionSchema>;

export const ModuleTargetSchema = z.enum(["crm", "campaign", "website", "webinar"]);
export type ModuleTarget = z.infer<typeof ModuleTargetSchema>;

export const ActionStatusSchema = z.enum(["PROPOSED", "APPROVED", "EXECUTED", "DISMISSED"]);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const EvidenceTypeSchema = z.enum(["hypothesis", "data_backed"]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const JourneyStageActionSchema = z.object({
  id: z.string().uuid(),
  stage_id: z.string().uuid(),
  journey_map_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  why_it_helps: z.string().default("Helps remove friction and guides customer to the next journey step"),
  module_target: ModuleTargetSchema,
  suggested_action_type: z.string(),
  evidence_type: EvidenceTypeSchema.default("hypothesis"),
  action_payload: z.record(z.string(), z.unknown()).default({}),
  expected_impact: z.string().default("Improved stage progression"),
  status: ActionStatusSchema.default("PROPOSED"),
  idempotency_key: z.string().optional().nullable(),
  executed_at: z.string().optional().nullable(),
  execution_result: z
    .object({
      message: z.string(),
      target_module: z.string(),
      link: z.string().optional(),
    })
    .optional()
    .nullable(),
  created_at: z.string(),
});
export type JourneyStageAction = z.infer<typeof JourneyStageActionSchema>;

export const JourneyMapStageSchema = z.object({
  id: z.string().uuid(),
  journey_map_id: z.string().uuid(),
  order_index: z.number().int().min(1),
  stage_key: z.string(),
  stage_name: z.string(),
  objective: z.string(),
  customer_actions: z.array(z.string()),
  touchpoints: z.array(z.string()),
  customer_needs: z.array(z.string()).default([]),
  customer_thoughts: z.array(z.string()).default([]),
  emotion: StageEmotionSchema.default("neutral"),
  friction_points: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  findings_type: EvidenceTypeSchema.default("hypothesis"),
  actions: z.array(JourneyStageActionSchema).default([]),
});
export type JourneyMapStage = z.infer<typeof JourneyMapStageSchema>;

export const CustomerJourneyMapSchema = z.object({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  title: z.string(),
  objective: z.string(),
  journey_type: z.string().default("custom"),
  summary: z.string().default(""),
  stages: z.array(JourneyMapStageSchema),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerJourneyMap = z.infer<typeof CustomerJourneyMapSchema>;

export const GenerateJourneyMapInputSchema = z.object({
  objective: z.string().min(3).max(500),
  contextAnswers: z.record(z.string(), z.string()).optional(),
});
export type GenerateJourneyMapInput = z.infer<typeof GenerateJourneyMapInputSchema>;

export const UpdateStageInputSchema = z.object({
  stage_name: z.string().optional(),
  objective: z.string().optional(),
  customer_actions: z.array(z.string()).optional(),
  touchpoints: z.array(z.string()).optional(),
  customer_needs: z.array(z.string()).optional(),
  customer_thoughts: z.array(z.string()).optional(),
  emotion: StageEmotionSchema.optional(),
  friction_points: z.array(z.string()).optional(),
  opportunities: z.array(z.string()).optional(),
  findings_type: EvidenceTypeSchema.optional(),
});
export type UpdateStageInput = z.infer<typeof UpdateStageInputSchema>;

export const AddStageInputSchema = z.object({
  stage_name: z.string().trim().min(1).max(120),
});
export type AddStageInput = z.infer<typeof AddStageInputSchema>;

export const ExecuteActionInputSchema = z.object({
  decision: z.enum(["approve", "dismiss"]),
});
export type ExecuteActionInput = z.infer<typeof ExecuteActionInputSchema>;

export interface NexusTelemetry {
  crmContactsCount: number;
  crmPipelineValue: number;
  crmStageBreakdown: Record<string, number>;
  activeWebsites: number;
  billingMrr: number;
  activeCampaigns: number;
  scheduledWebinars: number;
}
