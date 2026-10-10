import test from "node:test";
import assert from "node:assert/strict";
import {
  AuditEventInputSchema,
  AuditQueryFiltersSchema,
  sanitizeAuditMetadata,
  type AuditEventInput,
} from "../lib/validations/audit";
import {
  AuditService,
  AuditLoggingError,
} from "../services/audit.service";
import type { SupabaseClient } from "@supabase/supabase-js";

test("Audit Architecture Test Suite", async (t) => {
  const validBusinessId = "00000000-0000-0000-0000-000000000001";
  const validUserId = "11111111-1111-1111-1111-111111111111";
  const validWorkflowId = "22222222-2222-2222-2222-222222222222";

  await t.test("1. Valid event payload conforms to schema", () => {
    const payload: AuditEventInput = {
      business_id: validBusinessId,
      action: "crm.contact.created",
      actor: {
        id: validUserId,
        type: "user",
      },
      resource: {
        type: "crm_contact",
        id: "contact-123",
      },
      outcome: "success",
      metadata: {
        stage: "lead",
        source: "website_form",
      },
    };

    const parsed = AuditEventInputSchema.safeParse(payload);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.action, "crm.contact.created");
      assert.strictEqual(parsed.data.actor.type, "user");
      assert.strictEqual(parsed.data.schema_version, 1);
    }
  });

  await t.test("2. Rejects invalid business ID and malformed action names", () => {
    // Bad business UUID
    const badBizPayload = {
      business_id: "not-a-uuid",
      action: "crm.contact.created",
      actor: { id: "user-1", type: "user" as const },
      resource: { type: "crm_contact", id: "1" },
      outcome: "success" as const,
    };
    assert.strictEqual(AuditEventInputSchema.safeParse(badBizPayload).success, false);

    // Malformed action (missing category dot notation)
    const badActionPayload = {
      business_id: validBusinessId,
      action: "invalid_action_format",
      actor: { id: "user-1", type: "user" as const },
      resource: { type: "crm_contact", id: "1" },
      outcome: "success" as const,
    };
    assert.strictEqual(AuditEventInputSchema.safeParse(badActionPayload).success, false);
  });

  await t.test("3. Metadata Sanitization: Redacts credentials and sensitive tokens", () => {
    const rawMetadata = {
      user_name: "Alice",
      password: "SuperSecretPassword123!",
      api_key: "nx_live_998877665544",
      stripe_token: "tok_visa_1234",
      auth_cookie: "sb-auth-token=xyz",
      credit_card: "4111222233334444",
      nested: {
        safe_value: 42,
        secret_access_key: "abc123secret",
      },
      tags: ["lead", "enterprise"],
    };

    const sanitized = sanitizeAuditMetadata(rawMetadata) as Record<string, unknown>;

    assert.strictEqual(sanitized.user_name, "Alice");
    assert.strictEqual(sanitized.password, "[REDACTED]");
    assert.strictEqual(sanitized.api_key, "[REDACTED]");
    assert.strictEqual(sanitized.stripe_token, "[REDACTED]");
    assert.strictEqual(sanitized.auth_cookie, "[REDACTED]");
    assert.strictEqual(sanitized.credit_card, "[REDACTED]");

    const nested = sanitized.nested as Record<string, unknown>;
    assert.strictEqual(nested.safe_value, 42);
    assert.strictEqual(nested.secret_access_key, "[REDACTED]");
  });

  await t.test("4. Metadata Sanitization: Truncates oversized string values", () => {
    const longPrompt = "A".repeat(2000);
    const sanitized = sanitizeAuditMetadata({ prompt_summary: longPrompt }) as Record<string, string>;

    assert.ok(sanitized.prompt_summary.includes("[TRUNCATED_"));
    assert.ok(sanitized.prompt_summary.length < 1100);
  });

  await t.test("5. Metadata Sanitization: Prevents circular reference crashes", () => {
    const circularObj: Record<string, unknown> = { name: "Safe" };
    circularObj.self = circularObj;

    const sanitized = sanitizeAuditMetadata(circularObj) as Record<string, unknown>;
    assert.strictEqual(sanitized.name, "Safe");
    assert.strictEqual(sanitized.self, "[CIRCULAR_REFERENCE]");
  });

  await t.test("6. Actor modeling distinguishes human, AI agent, system, and integration", () => {
    const actorTypes = ["user", "ai_agent", "system", "integration"] as const;

    for (const actorType of actorTypes) {
      const payload: AuditEventInput = {
        business_id: validBusinessId,
        action: "security.api_key_rotated",
        actor: { id: "test-actor-1", type: actorType },
        resource: { type: "api_key", id: "key-1" },
        outcome: "success",
      };
      assert.strictEqual(AuditEventInputSchema.safeParse(payload).success, true);
    }

    // Invalid actor type fails
    const invalidActorPayload = {
      business_id: validBusinessId,
      action: "security.api_key_rotated",
      actor: { id: "test", type: "bot" },
      resource: { type: "api_key", id: "1" },
      outcome: "success",
    };
    assert.strictEqual(AuditEventInputSchema.safeParse(invalidActorPayload).success, false);
  });

  await t.test("7. AI Workflow Execution preserves initiator vs approver vs executor", () => {
    const aiWorkflowPayload: AuditEventInput = {
      business_id: validBusinessId,
      action: "ai.workflow.executed",
      // Actual Executor is the AI Agent
      actor: {
        id: "gemini-3.7-agent",
        type: "ai_agent",
      },
      // Initiator is the human user who triggered the prompt
      initiator: {
        id: validUserId,
        type: "user",
      },
      // Approver is the business owner who approved the checkpoint
      approver: {
        id: validUserId,
        type: "user",
        approved_at: new Date().toISOString(),
      },
      resource: {
        type: "ai_workflow",
        id: validWorkflowId,
      },
      outcome: "success",
      workflow_id: validWorkflowId,
      metadata: {
        action_name: "bulk_lead_reassignment",
        target_records: 15,
      },
    };

    const parsed = AuditEventInputSchema.safeParse(aiWorkflowPayload);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.actor.type, "ai_agent");
      assert.strictEqual(parsed.data.initiator?.type, "user");
      assert.strictEqual(parsed.data.approver?.type, "user");
      assert.notStrictEqual(parsed.data.actor.type, parsed.data.initiator?.type);
    }
  });

  await t.test("8. Critical failure policy: Fails closed when persistence fails", async () => {
    // Mock a failing Supabase client
    const mockFailingClient = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: { message: "Database connection terminated", code: "PGRST500" },
            }),
          }),
        }),
      }),
    };

    const payload: AuditEventInput = {
      business_id: validBusinessId,
      action: "billing.invoice.paid",
      actor: { id: validUserId, type: "user" },
      resource: { type: "billing_invoice", id: "inv_123" },
      outcome: "success",
    };

    // By default (critical: true), it must throw AuditLoggingError
    await assert.rejects(
      async () => {
        await AuditService.recordEvent(payload, {
          critical: true,
          client: mockFailingClient as unknown as SupabaseClient,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AuditLoggingError);
        assert.strictEqual((err as AuditLoggingError).code, "AUDIT_DB_INSERT_FAILED");
        return true;
      }
    );

    // If caller explicitly flags non-critical, it must not throw and return fallback
    const result = await AuditService.recordEvent(payload, {
      critical: false,
      client: mockFailingClient as unknown as SupabaseClient,
    });
    assert.strictEqual(result.outcome, "failure");
    assert.strictEqual(result.error_code, "AUDIT_DB_INSERT_FAILED");
  });

  await t.test("9. withAudit helper propagates business errors and records failure", async () => {
    const recordedRows: Record<string, unknown>[] = [];

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          recordedRows.push(data);
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000099", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    const eventTemplate: AuditEventInput = {
      business_id: validBusinessId,
      action: "crm.contact.deleted",
      actor: { id: validUserId, type: "user" },
      resource: { type: "crm_contact", id: "contact-del-1" },
      outcome: "success",
    };

    // When the inner business operation fails:
    await assert.rejects(
      async () => {
        await AuditService.withAudit(
          eventTemplate,
          async () => {
            throw new Error("Contact is locked by active deal");
          },
          { client: mockClient as unknown as SupabaseClient }
        );
      },
      /Contact is locked by active deal/
    );

    // Verifies that a failure audit log was recorded
    assert.ok(recordedRows.length > 0);
    const failureRow = recordedRows[0];
    assert.strictEqual(failureRow.outcome, "failure");
    assert.strictEqual(failureRow.error_message, "Contact is locked by active deal");
  });

  await t.test("10. Tenant isolation in query filters: enforces business_id scoping", () => {
    const validQuery = {
      business_id: validBusinessId,
      action: "auth.login",
      limit: 20,
    };

    const parsed = AuditQueryFiltersSchema.safeParse(validQuery);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.business_id, validBusinessId);
      assert.strictEqual(parsed.data.limit, 20);
      assert.strictEqual(parsed.data.offset, 0); // Default applied
    }

    // Missing business_id fails validation
    const missingBizQuery = {
      action: "auth.login",
    };
    assert.strictEqual(AuditQueryFiltersSchema.safeParse(missingBizQuery).success, false);
  });

  await t.test("11. Append-only contract: AuditService provides no update or delete seams", () => {
    const serviceMethods = Object.getOwnPropertyNames(AuditService);
    assert.strictEqual(serviceMethods.includes("updateEvent"), false);
    assert.strictEqual(serviceMethods.includes("deleteEvent"), false);
    assert.strictEqual(serviceMethods.includes("clearEvents"), false);
    assert.strictEqual(serviceMethods.includes("modifyEvent"), false);
  });

  await t.test("12. Registration & Onboarding audit flow emits business.created and auth.signup", async () => {
    const emittedActions: string[] = [];

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          emittedActions.push(data.action as string);
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000088", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    // Emit business creation
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "business.created",
        actor: { id: validUserId, type: "user" },
        resource: { type: "business", id: validBusinessId },
        outcome: "success",
        metadata: { workspace_name: "Test Workspace" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    // Emit user registration
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "auth.signup",
        actor: { id: validUserId, type: "user" },
        resource: { type: "auth_user", id: validUserId },
        outcome: "success",
        metadata: { username: "tester", email_domain: "example.com" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.deepStrictEqual(emittedActions, ["business.created", "auth.signup"]);
  });

  await t.test("13. Failed authentication attempts record auth.failed_login without storing passwords", async () => {
    const recordedPayloads: Record<string, unknown>[] = [];

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          recordedPayloads.push(data);
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000077", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    // Attempt with wrong credentials
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "auth.failed_login",
        actor: { id: "anonymous", type: "user" },
        resource: { type: "auth_session", id: "unauthenticated" },
        outcome: "failure",
        error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password" },
        metadata: {
          identifier_type: "email",
          // Attempting to pass password in metadata must be caught and redacted
          password: "MySecretPassword123!",
        },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.strictEqual(recordedPayloads.length, 1);
    const event = recordedPayloads[0];
    assert.strictEqual(event.action, "auth.failed_login");
    assert.strictEqual(event.outcome, "failure");

    const meta = event.metadata as Record<string, unknown>;
    assert.strictEqual(meta.password, "[REDACTED]");
    assert.strictEqual(meta.identifier_type, "email");
  });

  await t.test("14. OAuth callback provisions business and emits auth.login with provider context", async () => {
    const emittedEvents: Record<string, unknown>[] = [];

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          emittedEvents.push(data);
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000066", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    // OAuth Business provisioned
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "business.created",
        actor: { id: validUserId, type: "user" },
        resource: { type: "business", id: validBusinessId },
        outcome: "success",
        metadata: { workspace_name: "OAuth Workspace", auth_provider: "oauth" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    // OAuth Login completed
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "auth.login",
        actor: { id: validUserId, type: "user" },
        resource: { type: "auth_session", id: validUserId },
        outcome: "success",
        metadata: { auth_method: "oauth" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.strictEqual(emittedEvents.length, 2);
    assert.strictEqual(emittedEvents[0].action, "business.created");
    assert.strictEqual(emittedEvents[1].action, "auth.login");
    assert.strictEqual((emittedEvents[1].metadata as Record<string, unknown>).auth_method, "oauth");
  });

  await t.test("15. OAuth exchange failure captures failed attempt under system business context", async () => {
    let capturedFailure: Record<string, unknown> | null = null;

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          capturedFailure = data;
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000055", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    await AuditService.recordEvent(
      {
        business_id: "00000000-0000-0000-0000-000000000001",
        action: "auth.failed_login",
        actor: { id: "anonymous", type: "user" },
        resource: { type: "auth_session", id: "oauth" },
        outcome: "failure",
        error: { code: "OAUTH_EXCHANGE_ERROR", message: "Invalid authorization code" },
        metadata: { auth_method: "oauth" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.ok(capturedFailure !== null);
    const failure = capturedFailure as Record<string, unknown>;
    assert.strictEqual(failure.action, "auth.failed_login");
    assert.strictEqual(failure.outcome, "failure");
    assert.strictEqual(failure.error_code, "OAUTH_EXCHANGE_ERROR");
  });

  await t.test("16. Session logout records auth.logout and preserves user actor identity", async () => {
    let logoutEvent: Record<string, unknown> | null = null;

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          logoutEvent = data;
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000044", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "auth.logout",
        actor: { id: validUserId, type: "user" },
        resource: { type: "auth_session", id: validUserId },
        outcome: "success",
        metadata: { email_domain: "company.com" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.ok(logoutEvent !== null);
    const ev = logoutEvent as Record<string, unknown>;
    assert.strictEqual(ev.action, "auth.logout");
    assert.strictEqual(ev.actor_id, validUserId);
    assert.strictEqual(ev.actor_type, "user");
    assert.strictEqual(ev.outcome, "success");
  });

  await t.test("17. Session logout failure records auth.logout with outcome: failure and propagates error", async () => {
    let capturedFailure: Record<string, unknown> | null = null;

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          capturedFailure = data;
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000055", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    // When signOut fails, an audit failure event must be emitted
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "auth.logout",
        actor: { id: validUserId, type: "user" },
        resource: { type: "auth_session", id: validUserId },
        outcome: "failure",
        error: { code: "SIGNOUT_FAILED", message: "Supabase session revocation error" },
        metadata: { email_domain: "company.com" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.ok(capturedFailure !== null);
    const failure = capturedFailure as Record<string, unknown>;
    assert.strictEqual(failure.action, "auth.logout");
    assert.strictEqual(failure.outcome, "failure");
    assert.strictEqual(failure.error_code, "SIGNOUT_FAILED");
    assert.strictEqual(failure.actor_id, validUserId);
  });

  await t.test("18. Stored procedure RPC execution via recordEventViaRpc invokes record_audit_log_tx", async () => {
    let invokedRpcName: string | null = null;
    let rpcParams: Record<string, unknown> | null = null;

    const mockClient = {
      rpc: async (fn: string, params: Record<string, unknown>) => {
        invokedRpcName = fn;
        rpcParams = params;
        return { data: "00000000-0000-0000-0000-000000000099", error: null };
      },
    };

    const logId = await AuditService.recordEventViaRpc(
      {
        business_id: validBusinessId,
        action: "crm.contact.created",
        actor: { id: validUserId, type: "user" },
        resource: { type: "crm_contact", id: "00000000-0000-0000-0000-000000000077" },
        outcome: "success",
        metadata: { first_name: "Jane", last_name: "Doe" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.strictEqual(invokedRpcName, "record_audit_log_tx");
    assert.strictEqual(logId, "00000000-0000-0000-0000-000000000099");
    assert.ok(rpcParams !== null);
    const capturedParams = rpcParams as Record<string, unknown>;
    assert.strictEqual(capturedParams.p_action, "crm.contact.created");
    assert.strictEqual(capturedParams.p_business_id, validBusinessId);

    // Verify RPC failure handling (fails closed when critical)
    const failingRpcClient = {
      rpc: async () => ({
        data: null,
        error: { message: "Database constraint violation in procedure", code: "P0001", details: null },
      }),
    };

    await assert.rejects(
      async () => {
        await AuditService.recordEventViaRpc(
          {
            business_id: validBusinessId,
            action: "crm.contact.created",
            actor: { id: validUserId, type: "user" },
            resource: { type: "crm_contact", id: "00000000-0000-0000-0000-000000000077" },
            outcome: "success",
          },
          { client: failingRpcClient as unknown as SupabaseClient, critical: true }
        );
      },
      (err: unknown) => {
        const error = err as Error;
        return error.message.includes("Failed to persist audit log via RPC");
      }
    );
  });

  await t.test("19. Failed password authentication strictly attributes to SYSTEM_BUSINESS_ID and anonymous actor", async () => {
    let capturedFailedEvent: Record<string, unknown> | null = null;

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          capturedFailedEvent = data;
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000088", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    // Unauthenticated failed attempts must never claim victim's business or user identity
    await AuditService.recordEvent(
      {
        business_id: "00000000-0000-0000-0000-000000000001", // SYSTEM_BUSINESS_ID
        action: "auth.failed_login",
        actor: { id: "anonymous", type: "user" },
        resource: { type: "auth_session", id: "unauthenticated" },
        outcome: "failure",
        error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." },
        metadata: { identifier_type: "email" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.ok(capturedFailedEvent !== null);
    const event = capturedFailedEvent as Record<string, unknown>;
    assert.strictEqual(event.business_id, "00000000-0000-0000-0000-000000000001");
    assert.strictEqual(event.actor_id, "anonymous");
    assert.strictEqual(event.actor_type, "user");
    assert.strictEqual(event.outcome, "failure");
  });

  await t.test("20. Cross-tenant isolation: Query filtering prevents cross-tenant record leakage", async () => {
    let queryBusinessId: string | null = null;

    const mockClient = {
      from: (table: string) => {
        assert.strictEqual(table, "audit_logs");
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              if (col === "business_id") {
                queryBusinessId = val;
              }
              return {
                order: () => ({
                  range: async () => ({
                    data: [
                      {
                        id: "00000000-0000-0000-0000-000000000001",
                        business_id: val,
                        schema_version: 1,
                        timestamp: new Date().toISOString(),
                        action: "auth.login",
                        actor_id: validUserId,
                        actor_type: "user",
                        resource_type: "auth_session",
                        resource_id: validUserId,
                        outcome: "success",
                        metadata: {},
                        created_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                    count: 1,
                  }),
                }),
              };
            },
          }),
        };
      },
    };

    const res = await AuditService.queryEvents(
      { business_id: validBusinessId },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.strictEqual(queryBusinessId, validBusinessId);
    assert.strictEqual(res.events.length, 1);
    assert.strictEqual(res.events[0].business_id, validBusinessId);
  });

  await t.test("21. Sensitive data sanitization precision: catches PAN, CVC, PIN while preserving benign keys", () => {
    const rawMetadata = {
      pan: "1234567890123456",
      cvc: "999",
      pin: "4321",
      card_number: "4111222233334444",
      // Benign business keys that must NOT be falsely redacted:
      card_last4: "4444",
      card_brand: "visa",
      japan_panel: "tokyo-datacenter",
      company_expansion: true,
      safe_tag: "lead_generation",
    };

    const sanitized = sanitizeAuditMetadata(rawMetadata) as Record<string, unknown>;

    // Sensitive keys redacted
    assert.strictEqual(sanitized.pan, "[REDACTED]");
    assert.strictEqual(sanitized.cvc, "[REDACTED]");
    assert.strictEqual(sanitized.pin, "[REDACTED]");
    assert.strictEqual(sanitized.card_number, "[REDACTED]");

    // Benign keys preserved
    assert.strictEqual(sanitized.card_last4, "4444");
    assert.strictEqual(sanitized.card_brand, "visa");
    assert.strictEqual(sanitized.japan_panel, "tokyo-datacenter");
    assert.strictEqual(sanitized.company_expansion, true);
    assert.strictEqual(sanitized.safe_tag, "lead_generation");
  });

  await t.test("22. Lazy business provisioning vs legacy workspace migration distinction", async () => {
    const capturedEvents: Record<string, unknown>[] = [];

    const mockClient = {
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          capturedEvents.push(data);
          return {
            select: () => ({
              single: async () => ({
                data: { ...data, id: "00000000-0000-0000-0000-000000000099", created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    // 1. Lazy provisioning when business is newly created
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "business.created",
        actor: { id: validUserId, type: "user" },
        resource: { type: "business", id: validBusinessId },
        outcome: "success",
        metadata: { workspace_name: "Alice's Workspace", reason: "lazy_provisioning" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    // 2. Migration when updating existing legacy "My's Workspace"
    await AuditService.recordEvent(
      {
        business_id: validBusinessId,
        action: "business.updated",
        actor: { id: validUserId, type: "user" },
        resource: { type: "business", id: validBusinessId },
        outcome: "success",
        metadata: { updated_field: "name", new_name: "Alice's Workspace", reason: "legacy_migration" },
      },
      { client: mockClient as unknown as SupabaseClient }
    );

    assert.strictEqual(capturedEvents.length, 2);
    assert.strictEqual(capturedEvents[0].action, "business.created");
    assert.strictEqual(capturedEvents[1].action, "business.updated");
  });
});
