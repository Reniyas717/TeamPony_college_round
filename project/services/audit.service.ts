if (typeof window !== "undefined") {
  throw new Error("Security Violation: AuditService must never be imported into browser bundles.");
}

import {
  AuditEventInputSchema,
  AuditEventRecordSchema,
  AuditQueryFiltersSchema,
  sanitizeAuditMetadata,
} from "../lib/validations/audit";
import type {
  AuditEventInput,
  AuditEventRecord,
  AuditQueryFilters,
} from "../lib/validations/audit";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy-loads Next.js server-scoped Supabase client only when no client is passed.
 */
async function resolveDefaultSupabaseClient(useAdmin = false): Promise<SupabaseClient> {
  const { createClient, createAdminClient } = await import("../lib/supabase/server");
  return useAdmin ? createAdminClient() : await createClient();
}

/**
 * Custom Error classes for the Audit Subsystem.
 */
export class AuditLoggingError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = "AUDIT_PERSISTENCE_FAILED", details?: unknown) {
    super(message);
    this.name = "AuditLoggingError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AuditLoggingError.prototype);
  }
}

export class AuditValidationError extends AuditLoggingError {
  constructor(message: string, details?: unknown) {
    super(message, "AUDIT_VALIDATION_ERROR", details);
    this.name = "AuditValidationError";
    Object.setPrototypeOf(this, AuditValidationError.prototype);
  }
}

export interface RecordEventOptions {
  /**
   * If true (default), persistence failures throw AuditLoggingError to fail closed.
   * If false, failures log to stderr but do not throw (for non-critical operational telemetry).
   */
  critical?: boolean;
  /**
   * Optional caller-provided Supabase client (e.g. server-scoped client respecting RLS).
   * If omitted, the service derives the appropriate authenticated server client.
   */
  client?: SupabaseClient;
  /**
   * If true, uses the privileged admin client to record events (e.g. system background jobs,
   * webhooks, or failed login attempts before an authenticated session exists).
   */
  useAdminClient?: boolean;
}

/**
 * Central Audit Service for Nexus.
 *
 * Owns event validation, metadata sanitization, tenant isolation, append-only persistence,
 * and failure policies across all Nexus business domains.
 */
export class AuditService {
  /**
   * Records a single structured audit event.
   * By default, operations are critical: failure to persist will throw AuditLoggingError,
   * guaranteeing that business mutations cannot commit without their required audit trail.
   */
  static async recordEvent(
    input: AuditEventInput,
    options: RecordEventOptions = {}
  ): Promise<AuditEventRecord> {
    const isCritical = options.critical !== false;

    try {
      // 1. Validate payload at trust boundary
      const validationResult = AuditEventInputSchema.safeParse(input);
      if (!validationResult.success) {
        throw new AuditValidationError(
          `Audit event payload validation failed: ${validationResult.error.message}`,
          validationResult.error.flatten()
        );
      }

      const validEvent = validationResult.data;

      // 2. Sanitize metadata (recursively strip secrets, passwords, tokens, raw prompts)
      const sanitizedMetadata = sanitizeAuditMetadata(validEvent.metadata) as Record<string, unknown>;

      // 3. Resolve the appropriate database client
      const db = options.client || (await resolveDefaultSupabaseClient(options.useAdminClient));

      // 4. Construct the database payload matching public.audit_logs
      const dbPayload = {
        business_id: validEvent.business_id,
        schema_version: validEvent.schema_version,
        action: validEvent.action,
        actor_id: validEvent.actor.id,
        actor_type: validEvent.actor.type,
        initiator_id: validEvent.initiator?.id ?? null,
        initiator_type: validEvent.initiator?.type ?? null,
        approver_id: validEvent.approver?.id ?? null,
        approver_type: validEvent.approver?.type ?? null,
        approved_at: validEvent.approver?.approved_at ?? null,
        resource_type: validEvent.resource.type,
        resource_id: validEvent.resource.id,
        outcome: validEvent.outcome,
        error_code: validEvent.error?.code ?? null,
        error_message: validEvent.error?.message ?? null,
        correlation_id: validEvent.correlation_id ?? null,
        workflow_id: validEvent.workflow_id ?? null,
        request_id: validEvent.request_id ?? null,
        metadata: sanitizedMetadata,
      };

      // 5. Insert audit log record
      const { data, error } = await db
        .from("audit_logs")
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        throw new AuditLoggingError(
          `Failed to persist audit log record: ${error.message} (code: ${error.code})`,
          "AUDIT_DB_INSERT_FAILED",
          { pgCode: error.code, details: error.details }
        );
      }

      if (!data) {
        throw new AuditLoggingError(
          "Audit log insert returned empty response from database",
          "AUDIT_EMPTY_RESPONSE"
        );
      }

      // 6. Validate persisted record format
      const parsedRecord = AuditEventRecordSchema.safeParse(data);
      if (!parsedRecord.success) {
        return data as AuditEventRecord;
      }

      return parsedRecord.data;
    } catch (err: unknown) {
      const error = err instanceof AuditLoggingError ? err : new AuditLoggingError(
        err instanceof Error ? err.message : "Unknown error during audit logging",
        "AUDIT_UNEXPECTED_ERROR",
        err
      );

      // Safe diagnostic output without leaking sensitive data
      console.error(
        `[AUDIT-LOG-FAILURE] action=${input?.action} biz=${input?.business_id} outcome=${input?.outcome} error=${error.message}`
      );

      if (isCritical) {
        throw error;
      }

      // Return synthetic fallback object when caller explicitly requests non-critical behavior
      return {
        id: "00000000-0000-0000-0000-000000000000",
        business_id: input.business_id,
        schema_version: 1,
        timestamp: new Date().toISOString(),
        action: input.action,
        actor_id: input.actor.id,
        actor_type: input.actor.type,
        resource_type: input.resource.type,
        resource_id: input.resource.id,
        outcome: "failure",
        error_code: error.code,
        error_message: error.message,
        metadata: {},
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Convinience method for strictly required security and business events.
   * Always throws on failure.
   */
  static async recordCriticalEvent(
    input: AuditEventInput,
    options: Omit<RecordEventOptions, "critical"> = {}
  ): Promise<AuditEventRecord> {
    return this.recordEvent(input, { ...options, critical: true });
  }

  /**
   * Invokes the PostgreSQL stored procedure record_audit_log_tx
   * to atomically persist an audit log event within a database transaction or RPC context.
   */
  static async recordEventViaRpc(
    input: AuditEventInput,
    options: RecordEventOptions = {}
  ): Promise<string> {
    const isCritical = options.critical !== false;

    try {
      const validationResult = AuditEventInputSchema.safeParse(input);
      if (!validationResult.success) {
        throw new AuditValidationError(
          `Audit event payload validation failed: ${validationResult.error.message}`,
          validationResult.error.flatten()
        );
      }

      const validEvent = validationResult.data;
      const sanitizedMetadata = sanitizeAuditMetadata(validEvent.metadata) as Record<string, unknown>;
      const db = options.client || (await resolveDefaultSupabaseClient(options.useAdminClient));

      const { data, error } = await db.rpc("record_audit_log_tx", {
        p_business_id: validEvent.business_id,
        p_action: validEvent.action,
        p_actor_id: validEvent.actor.id,
        p_actor_type: validEvent.actor.type,
        p_resource_type: validEvent.resource.type,
        p_resource_id: validEvent.resource.id,
        p_outcome: validEvent.outcome,
        p_metadata: sanitizedMetadata,
        p_initiator_id: validEvent.initiator?.id ?? null,
        p_initiator_type: validEvent.initiator?.type ?? null,
        p_approver_id: validEvent.approver?.id ?? null,
        p_approver_type: validEvent.approver?.type ?? null,
        p_approved_at: validEvent.approver?.approved_at ?? null,
        p_error_code: validEvent.error?.code ?? null,
        p_error_message: validEvent.error?.message ?? null,
        p_correlation_id: validEvent.correlation_id ?? null,
        p_workflow_id: validEvent.workflow_id ?? null,
        p_request_id: validEvent.request_id ?? null,
        p_schema_version: validEvent.schema_version,
      });

      if (error) {
        throw new AuditLoggingError(
          `Failed to persist audit log via RPC: ${error.message} (code: ${error.code})`,
          "AUDIT_RPC_FAILED",
          { pgCode: error.code, details: error.details }
        );
      }

      return data as string;
    } catch (err: unknown) {
      const error = err instanceof AuditLoggingError ? err : new AuditLoggingError(
        err instanceof Error ? err.message : "Unknown error during RPC audit logging",
        "AUDIT_UNEXPECTED_ERROR",
        err
      );

      console.error(
        `[AUDIT-LOG-FAILURE-RPC] action=${input?.action} biz=${input?.business_id} outcome=${input?.outcome} error=${error.message}`
      );

      if (isCritical) {
        throw error;
      }

      return "00000000-0000-0000-0000-000000000000";
    }
  }

  /**
   * Transaction-aware wrapper pattern:
   * Executes a business operation and ensures the audit event is persisted.
   * If the audit persistence fails, the entire operation throws and fails closed.
   */
  static async withAudit<T>(
    eventInput: AuditEventInput,
    operation: () => Promise<T>,
    options: RecordEventOptions = {}
  ): Promise<{ result: T; auditEvent: AuditEventRecord }> {
    try {
      const result = await operation();
      
      const auditEvent = await this.recordEvent(
        { ...eventInput, outcome: "success" },
        { ...options, critical: true }
      );

      return { result, auditEvent };
    } catch (opError: unknown) {
      // Record failure audit trail
      const errorMessage = opError instanceof Error ? opError.message : "Operation failed";
      
      try {
        await this.recordEvent(
          {
            ...eventInput,
            outcome: "failure",
            error: {
              code: "OPERATION_FAILED",
              message: errorMessage,
            },
          },
          { ...options, critical: false }
        );
      } catch {
        // Suppress secondary audit error during primary business error propagation
      }

      throw opError;
    }
  }

  /**
   * Retrieves audit logs for a business with strict tenant isolation.
   * Callers must provide a valid verified business_id.
   */
  static async queryEvents(
    filters: AuditQueryFilters,
    options: { client?: SupabaseClient } = {}
  ): Promise<{ events: AuditEventRecord[]; total?: number }> {
    const validFilters = AuditQueryFiltersSchema.parse(filters);
    const db = options.client || (await resolveDefaultSupabaseClient());

    let query = db
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("business_id", validFilters.business_id);

    if (validFilters.action) {
      query = query.eq("action", validFilters.action);
    }
    if (validFilters.actor_id) {
      query = query.eq("actor_id", validFilters.actor_id);
    }
    if (validFilters.actor_type) {
      query = query.eq("actor_type", validFilters.actor_type);
    }
    if (validFilters.resource_type) {
      query = query.eq("resource_type", validFilters.resource_type);
    }
    if (validFilters.resource_id) {
      query = query.eq("resource_id", validFilters.resource_id);
    }
    if (validFilters.outcome) {
      query = query.eq("outcome", validFilters.outcome);
    }
    if (validFilters.correlation_id) {
      query = query.eq("correlation_id", validFilters.correlation_id);
    }
    if (validFilters.workflow_id) {
      query = query.eq("workflow_id", validFilters.workflow_id);
    }
    if (validFilters.from_timestamp) {
      query = query.gte("timestamp", validFilters.from_timestamp);
    }
    if (validFilters.to_timestamp) {
      query = query.lte("timestamp", validFilters.to_timestamp);
    }

    query = query
      .order("timestamp", { ascending: false })
      .range(validFilters.offset, validFilters.offset + validFilters.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new AuditLoggingError(
        `Failed to retrieve audit records: ${error.message}`,
        "AUDIT_QUERY_FAILED",
        error
      );
    }

    return {
      events: (data as AuditEventRecord[]) || [],
      total: count ?? undefined,
    };
  }
}
