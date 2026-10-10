import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AuditService } from "@/services/audit.service";
import { allowlistedAuditMetadata, type AuditAction } from "@/lib/validations/audit-actions";
import type { OwnerContext } from "@/lib/supabase/owner-context";

type AuditResult = "success" | "failure";

type WebinarAuditOptions = {
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  outcome?: AuditResult;
  error?: { code: string; message: string };
  client?: SupabaseClient;
  actorId?: string;
  actorType?: "user" | "ai_agent" | "system" | "integration";
  initiator?: { id: string; type: "user" | "ai_agent" | "system" | "integration" };
  approver?: { id: string; type: "user" | "ai_agent" | "system" | "integration"; approved_at?: string };
};

/**
 * Webinar operations use the shared audit contract. Persistence is deliberately
 * non-transactional here because this slice has no migration RPC that can wrap
 * the business mutation and audit insert in one database transaction.
 */
export async function recordWebinarAudit(
  context: Pick<OwnerContext, "businessId" | "user"> | { businessId: string; user?: OwnerContext["user"]; client?: SupabaseClient },
  options: WebinarAuditOptions,
) {
  const actorId = options.actorId ?? context.user?.id ?? "webinar.integration";
  const metadata = allowlistedAuditMetadata(options.action, options.metadata ?? {});

  return AuditService.recordEvent(
    {
      scope: "business",
      business_id: context.businessId,
      action: options.action,
      actor: { id: actorId, type: options.actorType ?? "user" },
      initiator: options.initiator,
      approver: options.approver,
      resource: { type: options.resourceType, id: options.resourceId },
      outcome: options.outcome ?? "success",
      error: options.error,
      metadata,
    },
    { client: options.client ?? ("client" in context ? context.client : undefined), critical: false },
  );
}

