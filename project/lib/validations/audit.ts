import { z } from "zod";
import { AUDIT_ACTIONS, type AuditAction } from "./audit-actions";

export const PLATFORM_SECURITY_ACTIONS = [
  "auth.signup",
  "auth.failed_login",
  "security.unauthorized_access",
  "security.rate_limited",
] as const;

/**
 * Authoritative Actor Types per AGENTS.md and Central Audit Architecture.
 * Distinguishes human users, autonomous AI agents, system processes, and external integrations.
 */
export const ActorTypeSchema = z.enum(["user", "ai_agent", "system", "integration"]);
export type ActorType = z.infer<typeof ActorTypeSchema>;

/**
 * Outcome of the auditable operation.
 */
export const AuditOutcomeSchema = z.enum(["success", "failure"]);
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>;

/**
 * Detailed actor description.
 */
export const AuditActorSchema = z.object({
  id: z.string().min(1, "Actor ID is required"),
  type: ActorTypeSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AuditActor = z.infer<typeof AuditActorSchema>;

/**
 * Approver details for high-consequence operations requiring verification.
 */
export const AuditApproverSchema = z.object({
  id: z.string().min(1, "Approver ID is required"),
  type: ActorTypeSchema,
  approved_at: z.string().datetime().optional(),
});
export type AuditApprover = z.infer<typeof AuditApproverSchema>;

/**
 * Standard Resource Identifier.
 */
export const AuditResourceSchema = z.object({
  type: z.string().min(1, "Resource type is required"),
  id: z.string().min(1, "Resource ID is required"),
});
export type AuditResource = z.infer<typeof AuditResourceSchema>;

/**
 * Standard Action Categories for Nexus.
 */
export const StandardAuditAction = AUDIT_ACTIONS;
export type StandardAuditActionType = (typeof StandardAuditAction)[number];

/**
 * Action schema validating dot-notated action format (category.resource.verb).
 */
export const AuditActionSchema = z.enum(AUDIT_ACTIONS);
export type { AuditAction };

/**
 * PostgreSQL-compatible UUID pattern (accepts standard v4, v1-v8, nil, and test fixtures).
 */
export const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const UuidSchema = z.string().regex(UUID_REGEX, "Invalid UUID format");

/**
 * Input schema for recording an audit event.
 */
export const AuditEventInputSchema = z.object({
  // Business events require an owner business; only approved security events may be platform scoped.
  scope: z.enum(["business", "platform"]).default("business"),
  business_id: UuidSchema.nullable(),
  
  // Action identifier
  action: AuditActionSchema,
  
  // Executor actor (who actually executed the action)
  actor: AuditActorSchema,
  
  // Initiator actor (who requested or initiated the action, e.g. human user who prompted the AI agent)
  initiator: AuditActorSchema.optional(),
  
  // Approver actor (for operations requiring explicit human approval checkpoints)
  approver: AuditApproverSchema.optional(),
  
  // Target resource
  resource: AuditResourceSchema,
  
  // Outcome
  outcome: AuditOutcomeSchema,
  
  // Optional error details when outcome is 'failure'
  error: z
    .object({
      code: z.string().min(1, "Error code is required"),
      message: z.string().min(1, "Error message is required"),
    })
    .optional(),
  
  // Distributed tracing & workflow correlation IDs
  correlation_id: z.string().min(1).optional(),
  workflow_id: z.string().min(1).optional(),
  request_id: z.string().min(1).optional(),
  
  // Metadata allowlisted payload (must not contain sensitive credentials)
  metadata: z.record(z.string(), z.unknown()).default({}),
  
  // Schema version (defaults to 1)
  schema_version: z.number().int().positive().default(1),
}).superRefine((event, ctx) => {
  if (event.scope === "business" && !event.business_id) {
    ctx.addIssue({ code: "custom", path: ["business_id"], message: "Business events require an owned business." });
  }
  if (event.scope === "platform" && (
    event.business_id !== null
    || !PLATFORM_SECURITY_ACTIONS.includes(event.action as (typeof PLATFORM_SECURITY_ACTIONS)[number])
    || event.outcome !== "failure"
    || event.actor.type !== "integration"
    || event.actor.id !== "supabase_auth"
    || event.initiator !== undefined
    || event.approver !== undefined
  )) {
    ctx.addIssue({ code: "custom", path: ["scope"], message: "Platform scope is restricted to failed events written by the trusted authentication integration." });
  }
});

export type AuditEventInput = z.input<typeof AuditEventInputSchema>;
export type ValidatedAuditEvent = z.output<typeof AuditEventInputSchema>;

/**
 * Full schema of a persisted audit event record in PostgreSQL.
 */
export const AuditEventRecordSchema = z.object({
  id: UuidSchema,
  business_id: UuidSchema.nullable(),
  schema_version: z.number().int().positive(),
  timestamp: z.string().datetime(),
  action: z.string(),
  actor_id: z.string(),
  actor_type: ActorTypeSchema,
  initiator_id: z.string().nullable().optional(),
  initiator_type: ActorTypeSchema.nullable().optional(),
  approver_id: z.string().nullable().optional(),
  approver_type: ActorTypeSchema.nullable().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  resource_type: z.string(),
  resource_id: z.string(),
  outcome: AuditOutcomeSchema,
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  correlation_id: z.string().nullable().optional(),
  workflow_id: z.string().nullable().optional(),
  request_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
});

export type AuditEventRecord = z.infer<typeof AuditEventRecordSchema>;

/**
 * Query filters for retrieving audit records with tenant isolation.
 */
export const AuditQueryFiltersSchema = z.object({
  business_id: UuidSchema,
  action: z.string().optional(),
  actor_id: z.string().optional(),
  actor_type: ActorTypeSchema.optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  outcome: AuditOutcomeSchema.optional(),
  correlation_id: z.string().optional(),
  workflow_id: z.string().optional(),
  from_timestamp: z.string().datetime().optional(),
  to_timestamp: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export type AuditQueryFilters = z.input<typeof AuditQueryFiltersSchema>;
export type ValidatedAuditQueryFilters = z.output<typeof AuditQueryFiltersSchema>;

/**
 * Sensitive field patterns that must NEVER be persisted in audit logs.
 */
export const SENSITIVE_KEY_PATTERNS = [
  /pass(word|wd)?/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /auth[_-]?token/i,
  /cookie/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /(credit[_-]?)?card[_-]?(num|number)?$/i,
  /cv[vc]/i,
  /(^|_)pan(_|$)/i,
  /ssn/i,
  /\bpin\b/i,
  /prompt[_-]?raw/i,
  /raw[_-]?prompt/i,
];

/**
 * Sanitizes arbitrary metadata before logging.
 * Recursively redacts sensitive keys and truncates long strings to prevent log bloat.
 */
export function sanitizeAuditMetadata(
  input: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (depth > 6) {
    return "[MAX_DEPTH_EXCEEDED]";
  }

  if (input === null || input === undefined) {
    return input;
  }

  // Handle primitives
  if (typeof input !== "object") {
    if (typeof input === "string" && input.length > 1024) {
      return `${input.slice(0, 1024)}... [TRUNCATED_${input.length - 1024}_CHARS]`;
    }
    return input;
  }

  // Handle dates
  if (input instanceof Date) {
    return input.toISOString();
  }

  // Cycle detection
  if (seen.has(input)) {
    return "[CIRCULAR_REFERENCE]";
  }
  seen.add(input);

  // Handle arrays
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((item) => sanitizeAuditMetadata(item, depth + 1, seen));
  }

  // Handle plain objects
  const sanitized: Record<string, unknown> = {};
  const entries = Object.entries(input as Record<string, unknown>);

  for (const [key, value] of entries) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeAuditMetadata(value, depth + 1, seen);
    }
  }

  return sanitized;
}
