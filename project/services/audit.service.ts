if (typeof window !== "undefined") {
  throw new Error("Security Violation: AuditService must never be imported into browser bundles.");
}

import {
  AuditEventInputSchema,
  AuditQueryFiltersSchema,
  PLATFORM_SECURITY_ACTIONS,
  sanitizeAuditMetadata,
} from "../lib/validations/audit";
import { allowlistedAuditMetadata } from "../lib/validations/audit-actions";
import type {
  AuditEventInput,
  AuditEventRecord,
  AuditQueryFilters,
} from "../lib/validations/audit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnerContext } from "../lib/supabase/owner-context";

/**
 * Lazy-loads Next.js server-scoped Supabase client only when no client is passed.
 */
async function resolveDefaultSupabaseClient(): Promise<SupabaseClient> {
  const { createClient } = await import("../lib/supabase/server");
  return createClient();
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
   * @deprecated Kept for call-site compatibility. Audit persistence failures always throw.
   */
  critical?: boolean;
  /**
   * Optional caller-provided Supabase client (e.g. server-scoped client respecting RLS).
   * If omitted, the service derives the appropriate authenticated server client.
   */
  client?: SupabaseClient;
}

/**
 * Central Audit Service for Nexus.
 *
 * Owns event validation, metadata sanitization, tenant isolation, append-only persistence,
 * and failure policies across all Nexus business domains.
 */
export class AuditService {
  static async recordBusinessEvent(
    context: OwnerContext,
    event: Omit<AuditEventInput, "scope" | "business_id" | "actor">
  ): Promise<string> {
    return this.recordEventViaRpc(
      {
        ...event,
        scope: "business",
        business_id: context.businessId,
        actor: { id: context.user.id, type: "user" },
      },
      { client: context.client }
    );
  }

  /** Records an anonymous or pre-business security event through its restricted server-only RPC. */
  static async recordPlatformSecurityEvent(
    action: (typeof PLATFORM_SECURITY_ACTIONS)[number],
    resource: { type: string; id: string },
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    const { createAdminClient } = await import("../lib/supabase/server");
    const db = createAdminClient();
    const safeMetadata = sanitizeAuditMetadata(
      allowlistedAuditMetadata(action, metadata)
    ) as Record<string, unknown>;
    const { data, error } = await db.rpc("record_platform_security_event", {
      p_action: action,
      p_resource_type: resource.type,
      p_resource_id: resource.id,
      p_metadata: safeMetadata,
    });
    if (error || typeof data !== "string") {
      throw new AuditLoggingError(
        "Could not record the security event.",
        "AUDIT_PLATFORM_RPC_FAILED",
        error ? { pgCode: error.code } : undefined
      );
    }
    return data;
  }

  /** Writes only through the checked database insertion routine. */
  static async recordEvent(
    input: AuditEventInput,
    options: RecordEventOptions = {}
  ): Promise<string> {
    return this.recordEventViaRpc(input, options);
  }

  /**
   * Convinience method for strictly required security and business events.
   * Always throws on failure.
   */
  static async recordCriticalEvent(
    input: AuditEventInput,
    options: Omit<RecordEventOptions, "critical"> = {}
  ): Promise<string> {
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
    try {
      const validationResult = AuditEventInputSchema.safeParse(input);
      if (!validationResult.success) {
        throw new AuditValidationError(
          `Audit event payload validation failed: ${validationResult.error.message}`,
          validationResult.error.flatten()
        );
      }

      const validEvent = validationResult.data;
      const sanitizedMetadata = sanitizeAuditMetadata(
        allowlistedAuditMetadata(validEvent.action, validEvent.metadata)
      ) as Record<string, unknown>;
      const db = options.client || (await resolveDefaultSupabaseClient());

      const { data, error } = await db.rpc("record_owner_audit_log_tx", {
        p_scope: validEvent.scope,
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

      throw error;
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
