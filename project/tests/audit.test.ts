import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AuditEventInputSchema,
  AuditQueryFiltersSchema,
  sanitizeAuditMetadata,
} from "../lib/validations/audit";
import { allowlistedAuditMetadata } from "../lib/validations/audit-actions";
import { AuditLoggingError, AuditService } from "../services/audit.service";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const CONTACT_ID = "22222222-2222-2222-2222-222222222222";
const AUDIT_ID = "33333333-3333-3333-3333-333333333333";

function rpcClient(result: { data: unknown; error: unknown } = { data: AUDIT_ID, error: null }) {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  return {
    calls,
    client: {
      rpc: async (name: string, params: Record<string, unknown>) => {
        calls.push({ name, params });
        return result;
      },
    } as unknown as SupabaseClient,
  };
}

test("central audit contract", async (t) => {
  await t.test("accepts only known business actions and valid actors", () => {
    const parsed = AuditEventInputSchema.safeParse({
      business_id: BUSINESS_ID,
      action: "crm.contact.created",
      actor: { id: USER_ID, type: "user" },
      resource: { type: "crm_contact", id: CONTACT_ID },
      outcome: "success",
    });
    assert.equal(parsed.success, true);
    assert.equal(AuditEventInputSchema.safeParse({
      business_id: BUSINESS_ID,
      action: "unknown.action",
      actor: { id: USER_ID, type: "user" },
      resource: { type: "crm_contact", id: CONTACT_ID },
      outcome: "success",
    }).success, false);
  });

  await t.test("accepts restricted platform scope only for approved security events", () => {
    const base = {
      scope: "platform",
      business_id: null,
      actor: { id: "supabase_auth", type: "integration" },
      resource: { type: "auth_session", id: "oauth" },
      outcome: "failure",
    };
    assert.equal(AuditEventInputSchema.safeParse({ ...base, action: "auth.failed_login" }).success, true);
    assert.equal(AuditEventInputSchema.safeParse({ ...base, action: "crm.contact.created" }).success, false);
    assert.equal(AuditEventInputSchema.safeParse({ ...base, business_id: BUSINESS_ID, action: "auth.failed_login" }).success, false);
  });

  await t.test("applies per-action metadata allowlists before recursive secret sanitization", () => {
    const allowlisted = allowlistedAuditMetadata("crm.contact.created", {
      contact_id: CONTACT_ID,
      source: "webinar",
      email: "person@example.com",
      note: "private note",
      password: "secret",
    });
    assert.deepEqual(allowlisted, { contact_id: CONTACT_ID, source: "webinar" });
    assert.deepEqual(sanitizeAuditMetadata({ token: "x", safe: "y" }), { token: "[REDACTED]", safe: "y" });
  });

  await t.test("writes through the checked RPC with scoped and filtered payload", async () => {
    const mock = rpcClient();
    const id = await AuditService.recordEvent({
      business_id: BUSINESS_ID,
      action: "crm.contact.created",
      actor: { id: USER_ID, type: "user" },
      resource: { type: "crm_contact", id: CONTACT_ID },
      outcome: "success",
      metadata: { contact_id: CONTACT_ID, source: "webinar", email: "private@example.com", password: "secret" },
    }, { client: mock.client });
    assert.equal(id, AUDIT_ID);
    assert.equal(mock.calls[0].name, "record_owner_audit_log_tx");
    assert.equal(mock.calls[0].params.p_scope, "business");
    assert.equal(mock.calls[0].params.p_business_id, BUSINESS_ID);
    assert.deepEqual(mock.calls[0].params.p_metadata, { contact_id: CONTACT_ID, source: "webinar" });
  });

  await t.test("derives business and human actor from verified owner context", async () => {
    const mock = rpcClient();
    const context = {
      client: mock.client,
      user: { id: USER_ID } as never,
      businessId: BUSINESS_ID,
    };
    await AuditService.recordBusinessEvent(context, {
      action: "crm.contact.updated",
      resource: { type: "crm_contact", id: CONTACT_ID },
      outcome: "success",
      metadata: { contact_id: CONTACT_ID, changed_fields: ["stage"] },
    });
    const params = mock.calls[0].params;
    assert.equal(params.p_business_id, BUSINESS_ID);
    assert.equal(params.p_actor_id, USER_ID);
    assert.equal(params.p_actor_type, "user");
    assert.equal(params.p_scope, "business");
  });

  await t.test("fails closed without returning a synthetic audit row", async () => {
    const mock = rpcClient({ data: null, error: { message: "denied", code: "42501" } });
    await assert.rejects(
      () => AuditService.recordEvent({
        business_id: BUSINESS_ID,
        action: "crm.contact.deleted",
        actor: { id: USER_ID, type: "user" },
        resource: { type: "crm_contact", id: CONTACT_ID },
        outcome: "success",
      }, { client: mock.client, critical: false }),
      (error: unknown) => error instanceof AuditLoggingError && error.code === "AUDIT_RPC_FAILED",
    );
  });

  await t.test("query filters require an explicit tenant and bounded pagination", () => {
    assert.equal(AuditQueryFiltersSchema.safeParse({ business_id: BUSINESS_ID, limit: 50, offset: 0 }).success, true);
    assert.equal(AuditQueryFiltersSchema.safeParse({ action: "auth.login" }).success, false);
    assert.equal(AuditQueryFiltersSchema.safeParse({ business_id: BUSINESS_ID, limit: 500 }).success, false);
  });

  await t.test("does not expose a non-transactional withAudit wrapper", () => {
    assert.equal(Object.getOwnPropertyNames(AuditService).includes("withAudit"), false);
  });
});
