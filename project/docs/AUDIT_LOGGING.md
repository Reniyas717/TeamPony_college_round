# Nexus Central Audit Logging Architecture (`AUDIT_LOGGING.md`)

> **Module Status:** Core Shared Infrastructure  
> **Service Location:** `project/services/audit.service.ts`  
> **Schema Definition:** `project/lib/validations/audit.ts`  
> **Database Migrations:** `supabase/migrations/002_audit_logs_schema.sql` & `project/supabase/migrations/20261010_audit_logs_schema.sql`  
> **Governing Directives:** [`AGENTS.md §9`](../../AGENTS.md#L387)

---

## 1. Architectural Overview

Nexus is a unified business operating platform with CRM, billing, marketing, website building, analytics, and autonomous AI agents. All security events and meaningful business state changes must be verifiable and auditable.

The Central Audit Service provides a typed, server-only, tenant-isolated, append-only logging foundation that all business services invoke.

```text
┌─────────────────────────────────────────────────────────────────┐
│ Next.js API Route Handler (@/app/api/.../route.ts)             │
│ • Authenticates session & resolves verified owner_id            │
│ • Validates untrusted request body with Zod                     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Domain Business Service (@/services/...service.ts)              │
│ • Resolves single business owned by user                        │
│ • Executes core business logic mutation                         │
│ • Calls AuditService.recordEvent() or AuditService.withAudit()  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Central Audit Service (@/services/audit.service.ts)             │
│ • Validates event payload against AuditEventInputSchema         │
│ • Strips & redacts sensitive fields via sanitizeAuditMetadata   │
│ • Enforces fail-closed policy for critical events               │
│ • Prevents client bundle exposure (server-only)                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ PostgreSQL Database (Supabase: public.audit_logs)               │
│ • Single-tenant RLS isolation (business_id = owner's business) │
│ • Append-only immutability via trg_audit_logs_immutable         │
│ • Atomic execution helper via record_audit_log_tx RPC           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Mandatory 7-Step Integration Pattern

Every current and future domain service in Nexus (CRM, Billing, Websites, Marketing, AI Workflows) must follow this lifecycle:

```typescript
// Example: CRM Contact Creation in crm.service.ts
export class CrmService {
  static async createContact(ownerId: string, input: CreateContactInput) {
    // Step 1: Authorize & resolve verified business_id on the server
    const businessId = await resolveBusinessIdForOwner(ownerId);
    if (!businessId) {
      throw new Error("UNAUTHORIZED: No verified business owned by user");
    }

    // Step 2: Validate untrusted input at trust boundary
    const validated = CreateContactSchema.parse(input);

    // Step 3: Execute the business mutation
    const { data: contact, error: dbError } = await supabase
      .from("crm_contacts")
      .insert({
        business_id: businessId,
        first_name: validated.firstName,
        last_name: validated.lastName,
        email: validated.email,
        stage: "lead",
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to create contact: ${dbError.message}`);
    }

    // Step 4 & 5: Record the structured audit event through the shared service
    // Critical: true (default) ensures the operation fails closed if audit persistence fails
    await AuditService.recordEvent({
      business_id: businessId,
      action: "crm.contact.created",
      actor: {
        id: ownerId,
        type: "user",
      },
      resource: {
        type: "crm_contact",
        id: contact.id,
      },
      outcome: "success",
      metadata: {
        stage: "lead",
        source: validated.source || "manual",
        email_domain: validated.email.split("@")[1],
      },
    });

    // Step 6 & 7: Return success only after mutation and audit trail succeed
    return contact;
  }
}
```

---

## 3. Actor Modeling & Disambiguation

Nexus operations can be executed by humans, autonomous AI agents, scheduled system processes, or third-party webhooks. The audit subsystem strictly preserves this distinction:

### 3.1 Actor Types

| Type | Identifier | Description |
|---|---|---|
| **`user`** | Supabase User UUID | Logged-in human business owner. |
| **`ai_agent`** | Model/Agent ID | Autonomous Nexus AI agent executing business steps. |
| **`system`** | Job / Cron Name | Scheduled background worker, trigger, or routine cleanup. |
| **`integration`** | Provider Name | External service (e.g. `stripe_webhook`, `resend_bounce`). |

### 3.2 Initiator vs. Approver vs. Executor

When an AI Agent executes an action originally requested by a user and approved by the owner:

```typescript
await AuditService.recordEvent({
  business_id: businessId,
  action: "ai.workflow.executed",
  // The actual executor of the database mutation:
  actor: {
    id: "nexus-agent-gemini-v1",
    type: "ai_agent",
  },
  // Who originally initiated the prompt:
  initiator: {
    id: humanUserId,
    type: "user",
  },
  // Who signed off at the human approval checkpoint:
  approver: {
    id: humanUserId,
    type: "user",
    approved_at: new Date().toISOString(),
  },
  resource: {
    type: "ai_workflow",
    id: workflowId,
  },
  outcome: "success",
  metadata: {
    workflow_name: "lead_nurture_campaign",
    recipients_count: 42,
  },
});
```

> **Strict Rule:** Never represent an AI-executed action as a direct human action simply because a human originally requested it.

---

## 4. Transaction-Aware Recording & Failure Policy

### 4.1 Fail-Closed Policy for Critical Events

By default, `AuditService.recordEvent(..., { critical: true })` runs in **fail-closed** mode.
- If the audit event fails validation or PostgreSQL rejects the insert, `AuditLoggingError` is thrown.
- The business operation must not catch and swallow this error.
- The caller receives an HTTP 500 / error response, preventing silent data state modifications without an audit trail.

### 4.2 Non-Critical Operational Events

For non-security telemetry (e.g. best-effort notifications):
```typescript
await AuditService.recordEvent(eventInput, { critical: false });
```
This logs a warning to stderr and returns a synthetic failure record rather than throwing.

### 4.3 Database Transactions & Stored Procedures

PostgREST over HTTP executes individual HTTP statements. For transactional workflows where business mutation and audit log must commit in the exact same PostgreSQL transaction, use the stored procedure helper:

```sql
SELECT public.record_audit_log_tx(
  p_business_id := '00000000-0000-0000-0000-000000000001'::uuid,
  p_action := 'billing.subscription.cancelled',
  p_actor_id := 'user-uuid',
  p_actor_type := 'user',
  p_resource_type := 'billing_subscription',
  p_resource_id := 'sub-uuid',
  p_outcome := 'success',
  p_metadata := '{"reason": "customer_requested"}'::jsonb
);
```

TypeScript callers can also invoke this helper directly via `AuditService.recordEventViaRpc(input, options)`.

### 4.4 External Service Boundaries

External side effects (e.g., Stripe charges, email sends) cannot be committed inside a PostgreSQL transaction. Domain services must follow:
1. **Idempotency Key:** Generate and record a deterministic idempotency key.
2. **Audit Attempt:** Emit an `ai.workflow.executed` or `billing.payment.initiated` audit event.
3. **Execute External Call:** Perform the API call with the idempotency key.
4. **Audit Result:** Emit the final outcome event (`success` or `failure`).

---

## 5. Privacy & Data Minimisation

The audit table is an operational security log, not a data dumping ground.

### Prohibited Data
The following must **NEVER** appear in audit records:
- Passwords or password hashes.
- Session tokens, bearer tokens, or auth cookies.
- Supabase service role keys or secret environment variables.
- Credit card numbers, CVVs, or full PANs.
- Raw HTTP request/response bodies.
- Unredacted LLM reasoning chains or unrestricted user prompts.

### Automatic Sanitization
`sanitizeAuditMetadata()` automatically:
1. Scans keys recursively for patterns matching passwords, secrets, tokens, cards, and keys.
2. Replaces values with `"[REDACTED]"`.
3. Truncates strings longer than 1024 characters.
4. Protects against circular object references.
5. Limits object recursion to 6 levels.

---

## 6. Append-Only Immutability & Tenant Security

1. **Database Trigger:** The PostgreSQL trigger `trg_audit_logs_immutable` runs `BEFORE UPDATE OR DELETE` and raises an exception:
   ```text
   ERROR: Audit logs are append-only. Modification or deletion of audit records is strictly prohibited.
   ```
2. **Row Level Security:**
   - Authenticated users can only `SELECT` records where `business_id` matches their owned business.
   - Authenticated users can only `INSERT` records where `business_id` matches their owned business.
   - `UPDATE` and `DELETE` policies are intentionally omitted, defaulting to deny.
3. **Immutability Scope Note:** Application-level controls and database triggers prevent modification by standard application roles and users. They do not constitute hardware-level WORM storage against privileged superusers with raw database console access.
