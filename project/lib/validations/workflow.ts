import { z } from "zod";

/**
 * Capability taxonomy of supported triggers, conditions, delays, and actions.
 * Per NL_WORKFLOW_ENGINE_SPEC.md §3.1
 */
export const NodeCapabilitySchema = z.enum([
  // CRM Triggers & Actions
  "crm.contact.created",
  "crm.contact.updated",
  "crm.contact.tagged",
  "crm.contact.stage_changed",
  "crm.lead.create_deal",
  "crm.notification.slack",

  // Multi-Channel Marketing Dispatch
  "marketing.email.send",
  "marketing.sms.send",
  "marketing.whatsapp.send",

  // Webinar Events
  "webinar.session.ended",
  "webinar.attendee.checked_in",

  // SaaS Billing & Lifecycle
  "billing.subscription.created",
  "billing.subscription.canceled",
  "billing.invoice.failed",

  // Website Builder Events
  "website.page.viewed",
  "website.form.submitted",

  // Flow Logic & Human Gate
  "condition.branch",
  "delay.wait",
  "approval.manual_gate",
]);

export type NodeCapability = z.infer<typeof NodeCapabilitySchema>;

export const WorkflowNodeTypeSchema = z.enum([
  "TRIGGER",
  "CONDITION",
  "DELAY",
  "ACTION",
  "APPROVAL_GATE",
]);

export type WorkflowNodeType = z.infer<typeof WorkflowNodeTypeSchema>;

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: WorkflowNodeTypeSchema,
  capability: NodeCapabilitySchema,
  label: z.string().min(1).max(100),
  description: z.string().optional(),
  config: z.record(z.string(), z.any()).default({}),
  requiresApproval: z.boolean().default(false),
  retryPolicy: z
    .object({
      maxRetries: z.number().int().min(0).max(5).default(3),
      backoffSeconds: z.number().int().min(5).max(3600).default(30),
    })
    .default({ maxRetries: 3, backoffSeconds: 30 }),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  conditionLabel: z.string().optional(),
  sourceHandle: z.enum(["default", "true", "false"]).default("default"),
});

export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

export const WorkflowDAGSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional().default(""),
  naturalLanguagePrompt: z.string().min(1),
  nodes: z.array(WorkflowNodeSchema).min(1),
  edges: z.array(WorkflowEdgeSchema).default([]),
  isHighImpact: z.boolean().default(false),
  estimatedAudienceCount: z.number().int().nonnegative().optional(),
});

export type WorkflowDAG = z.infer<typeof WorkflowDAGSchema>;

export const WorkflowStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowRunStatusSchema = z.enum([
  "RUNNING",
  "AWAITING_APPROVAL",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;

export const WorkflowStepStatusSchema = z.enum([
  "PENDING",
  "EXECUTING",
  "SUCCESS",
  "FAILED",
  "SKIPPED",
  "PAUSED_FOR_APPROVAL",
]);
export type WorkflowStepStatus = z.infer<typeof WorkflowStepStatusSchema>;

// Full persisted workflow record
export interface AutomationWorkflow {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  natural_language_prompt: string;
  status: WorkflowStatus;
  dag_definition: WorkflowDAG;
  is_high_impact: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Full persisted workflow run instance
export interface WorkflowRun {
  id: string;
  workflow_id: string;
  business_id: string;
  trigger_event_id: string | null;
  status: WorkflowRunStatus;
  current_node_id: string | null;
  context_data: Record<string, unknown>;
  error_details: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

// Full step log telemetry
export interface WorkflowStepLog {
  id: string;
  run_id: string;
  workflow_id: string;
  node_id: string;
  node_type: WorkflowNodeType;
  capability: NodeCapability;
  status: WorkflowStepStatus;
  idempotency_key: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  retry_count: number;
  execution_duration_ms: number | null;
  executed_at: string;
}

// Request Schemas
export const GenerateWorkflowInputSchema = z.object({
  prompt: z.string().min(3, "Prompt must be at least 3 characters"),
});
export type GenerateWorkflowInput = z.infer<typeof GenerateWorkflowInputSchema>;

export const CreateWorkflowSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  naturalLanguagePrompt: z.string().min(1),
  dag: WorkflowDAGSchema,
  status: WorkflowStatusSchema.default("DRAFT"),
});
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;

export const TriggerWorkflowInputSchema = z.object({
  payload: z.record(z.string(), z.any()).default({}),
});
export type TriggerWorkflowInput = z.infer<typeof TriggerWorkflowInputSchema>;

export const ApproveWorkflowInputSchema = z.object({
  runId: z.string().min(1),
  approved: z.boolean(),
  reason: z.string().optional(),
});
export type ApproveWorkflowInput = z.infer<typeof ApproveWorkflowInputSchema>;

/**
 * Validates that a DAG contains no cyclical dependencies via Kahn's algorithm.
 */
export function validateDAGNoCycles(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { isValid: boolean; cycle?: string[] } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
      adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visitedCount++;
    for (const neighbor of adj.get(current) || []) {
      const nextDeg = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, nextDeg);
      if (nextDeg === 0) queue.push(neighbor);
    }
  }

  return { isValid: visitedCount === nodeIds.size };
}
