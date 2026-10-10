# Nexus audit logging

This document describes the audit contract present in the current checkout. It separates implemented application behavior from OpenSpec requirements that still need database work.

## Source of truth

- Service: project/services/audit.service.ts
- Event validation and sanitization: project/lib/validations/audit.ts
- Action vocabulary and metadata allowlists: project/lib/validations/audit-actions.ts
- Owner context: project/lib/supabase/owner-context.ts
- Audit API: project/app/api/audit/route.ts
- Base schema: project/supabase/migrations/20261010_audit_logs_schema.sql
- Compatibility migration: project/supabase/migrations/20261020_tenant_isolation_compatibility.sql
- CRM transaction migration: project/supabase/migrations/20261021_atomic_crm_journey_rpc.sql
- Website transaction migration: project/supabase/migrations/20261022_atomic_website_rpc.sql
- Database checks: project/supabase/verification/tenant_isolation_checks.sql
- Manual handoff: project/docs/AUDIT_MIGRATION_DEMO_HANDOFF.md
- OpenSpec requirement: openspec/changes/fix-tenant-isolation-and-audit-coverage/specs/central-audit-logging/spec.md

The migration files are source files only. No live Supabase connection was available for this documentation pass, so this document does not claim that a migration has been applied to a target database. The 20261021 and 20261022 migrations have been inspected, but their worker/runtime SQL and installed grants remain unvalidated.

## Contract at the application seam

AuditService.recordEvent, recordEventViaRpc, and recordCriticalEvent return the persisted audit row UUID as a string. They validate the event, apply the action-specific metadata allowlist, sanitize the remaining values, and call public.record_audit_log_tx. They do not return a synthetic success record.

AuditService.recordBusinessEvent(context, event) is the preferred owner-facing helper. It derives:

- scope = business
- business_id from the verified OwnerContext
- the executor as the verified session user
- the session-scoped Supabase client

The lower-level recordEvent seam remains necessary for workflow, integration, and worker attribution, but those callers must supply trusted server-derived context and an appropriate database client. Workflow callers now treat the returned audit value as a UUID string.

AuditService.recordPlatformSecurityEvent uses the server admin client and the restricted public.record_platform_security_event RPC. The SQL function fixes business_id to NULL, actor_id to supabase_auth, actor_type to integration, and outcome to failure. It currently accepts auth.signup, auth.failed_login, security.unauthorized_access, and security.rate_limited.

## Event shape

| Field | Contract |
|---|---|
| scope | business or platform; defaults to business |
| business_id | UUID for business events; null for platform events |
| action | One of the 84 closed values in AUDIT_ACTION_CATALOG.md |
| actor | id and type: user, ai_agent, system, or integration |
| initiator | Optional actor that requested a delegated or AI operation |
| approver | Optional actor and approval timestamp |
| resource | type and id for the affected resource |
| outcome | success or failure |
| error | Optional safe code and message for a failed event |
| correlation fields | Optional correlation_id, workflow_id, and request_id |
| metadata | Object filtered by the action allowlist, then sanitized |
| schema_version | Positive integer, default 1 |

Platform scope is intentionally strict: it accepts only an allowed platform action, a null business reference, a failed outcome, the fixed Supabase integration actor, and no initiator or approver.

## Trust and tenant boundaries

The owner context helper calls auth.getUser on the server session client and resolves the one businesses row whose owner_id is that user. A missing session is a safe 401; a missing owned business is a safe 404; database failure is a safe service error. The helper does not accept a client-supplied business ID as proof of ownership.

The audit API first resolves owner context and then applies the resolved business ID to the query. The owner view is therefore business-scoped. Platform rows have a null business reference and are excluded by this query shape.

The compatibility migration removes direct table grants for application roles and retains an owner SELECT policy. Its checked record_audit_log_tx function validates the authenticated business owner, user actor, workflow context for AI events, and workflow approver relationship. The service-role branch is restricted to fixed server actors.

## Privacy and metadata handling

Metadata passes through two aligned filters:

1. allowlistedAuditMetadata removes keys that are not listed for that action.
2. The compatibility migration applies the same per-action key checks for all 84 declared action values before persistence.
3. sanitizeAuditMetadata recursively redacts sensitive key names, truncates long strings, limits recursion depth, limits arrays to 50 items, and replaces circular references.

Sensitive key patterns include passwords, secrets, tokens, authorization values, cookies, API keys, private keys, card numbers, CVV/PIN/SSN values, and raw prompts. Audit events must not contain credentials, message bodies, unrestricted provider payloads, raw request/response bodies, or free-text feedback.

The application and SQL paths both allow only the action-specific resource references, counts, changed-field names, selected statuses, provider references, and common correlation fields declared in the catalog. The database checks should still be run after migration to confirm the installed function is the expected version.

## Failure behavior

AuditLoggingError is thrown when validation, the audit RPC, or persistence fails. The critical option is retained only for call-site compatibility and does not enable a best-effort synthetic fallback. The old withAudit contract and synthetic zero-ID failure record are not part of the current service.

This does not make a preceding JavaScript mutation atomic. A service that updates a business table and then calls AuditService in a separate request can still leave the business mutation committed if the later audit call fails. Current source comments identify this limitation in CRM, website, journey, workflow, and webinar paths.

## Append-only history

The base audit migration creates trg_audit_logs_immutable, which rejects updates and deletes, and omits normal update/delete policies. The compatibility migration keeps the history table protected, changes the business foreign key to ON DELETE RESTRICT, removes direct application inserts, and permits owner reads.

The compatibility migration does not recreate the immutable trigger if a target database never ran the base audit migration. Verify that the trigger exists on the installed database before relying on append-only protection.

## Service-role attribution

The compatibility migration accepts only fixed service actors:

- Public webinar registration and feedback use the fixed integration actor and are restricted to registration, notification, feedback, and marketing-consent actions. webinar.notification.queued requires an owned registration row.
- The manual webinar worker uses actor type system and actor ID webinar.manual-worker. It is restricted to webinar.email.processing_started, webinar.email.provider_accepted, webinar.email.failed, and webinar.email.needs_review.
- Initiator and approver fields are rejected on these service-role paths.
- Resource IDs and related business ownership are checked before insertion.

The public notification path is now aligned with the restricted service-role contract. Its migration and runtime behavior still require live database validation after the migration is executed.

## Implemented coverage and remaining work

Implemented application coverage in this checkout includes owner-scoped audit calls for authentication and Google connection events, CRM mutations, website lifecycle mutations, journey-map mutations, workflow definition/run/approval/step events, and webinar lifecycle/public/attendance/follow-up/email paths. The complete action vocabulary also includes billing and marketing actions, but no current billing or marketing service call site was found during this documentation pass.

The following OpenSpec requirements remain incomplete or database-dependent:

- The 20261021 migration defines checked audited CRM transaction RPCs and the CRM service calls them, but those SQL paths remain unverified until the migration is executed. Website, journey-map, workflow, webinar lifecycle, public registration/feedback, follow-up, and email-processing paths still do not all commit the business mutation and audit event through one operation-specific transaction.
- Public webinar registration and feedback mutate through existing RPCs and then write audit rows separately; a later audit failure cannot roll back the already-committed public mutation.
- Meet provisioning and email provider outcomes have intent/result handling in application code, but their required audit and external-side-effect transaction boundary is not complete.
- The 20261020 migration provides earlier CRM checked RPCs, 20261021 replaces the audit seam while adding six CRM transaction RPCs, and 20261022 adds five audited website RPCs plus direct website-write revocation. No journey mutation RPCs were found in 20261021 despite the migration filename; equivalent operation-specific audited RPCs or triggers for journey, workflow, webinar, follow-up, and email paths are still absent.
- Platform-event failure recording is attempted from authentication code, but the helper catches audit failure and logs it; it cannot claim that the platform event was persisted when the RPC fails.
- The public webinar notification audit action is now aligned: webinar.notification.queued uses the fixed public registration integration actor and requires an owned registration row in the service-role branch.
- Billing and marketing action names remain vocabulary only until their product mutation paths emit events.
- The compatibility, CRM, and website migrations remain unexecuted in the target Supabase database. No live verification has been run for rollback, RLS, grants, trigger presence, two-owner behavior, or the worker/runtime SQL paths.
- The manual webinar worker's claim/finalization RPCs and its fixed audit actor/actions have been inspected in source but have not been exercised against an installed database and real runtime queue.
- The six CRM transaction functions in 20261021 were inspected by name and body, but their installed privileges and runtime behavior are unvalidated. The migration does not show explicit grants for those new function names, so inspect function privileges after installation before treating them as callable application seams.
- The five website transaction functions in 20261022 were inspected by name and body, including their authenticated-only EXECUTE grants and direct-write revocation, but their installed privileges and application runtime usage remain unvalidated.

## Local verification status

The local production build remains blocked in this environment:

- intelligence-client.tsx references Mermaid. The current package.json and lockfile declare Mermaid, but node_modules/mermaid is absent and registry access was blocked, so the dependency could not be installed for the local build.
- next/font/google requires fetching Google Fonts during the build, but the environment cannot reach the font service.

Do not report the production build as passing until those environment prerequisites are available. Documentation-only changes in this pass were not tested with the production build.

## Verification checklist

Before calling the audit implementation complete, verify on the target Supabase database:

- Run the migrations in the order documented in AUDIT_MIGRATION_DEMO_HANDOFF.md.
- Base audit table, immutable trigger, RLS, and compatibility migration are installed.
- audit_logs.scope exists with the business/platform consistency constraint.
- Direct table INSERT, UPDATE, and DELETE are denied to browser roles.
- The checked audit RPC has the exact 20-parameter signature used by the application and grants only the intended roles.
- Its SQL action and metadata checks cover all 84 declared actions.
- Re-check journey_stage_actions privileges after 20261021; do not assume the older verification query's no-direct-write expectation remains the complete rule without comparing the installed grants.
- Business events reject missing or unowned business context.
- Platform events have null business and fixed integration attribution.
- Two owners cannot read or mutate one another's records, and anonymous callers cannot read audit history.
- Operation-specific mutation RPCs or triggers roll back the business row when required audit insertion fails.
- Focused tests, lint, and production build pass after the local environment blockers are removed.
