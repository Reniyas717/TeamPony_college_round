# Tenant isolation and audit logging implementation plan

Status: Design decisions settled; implementation plan ready for review. Covers final audit priorities 8 (audit logging) and 1 (tenant isolation). Application implementation has not started.

## Agreed hackathon scope

- Cover every existing operational feature, including authentication, Google connection, CRM, websites, webinars and series, public registration and feedback, customer journey maps, workflow execution and approvals, and manual email delivery.
- This is a development demonstration using Supabase. Keep the current stack, login flow, and single-owner business model.
- Use a real Supabase write for demo business operations. If a save fails, return a clear error rather than claiming success with process-local data. This is the implementation recommendation under the owner's instruction to choose an approach suitable for a hackathon.
- Preserve old default-business data without assigning it to a guessed owner. Ordinary owner requests must not fall back to it. Any later reassignment requires an explicit verified mapping.
- For uncertain provider outcomes, retain the operation reference and show Needs review. Use existing manual controls; automatic retries are allowed only where an existing provider idempotency guarantee makes them safe.
- Keep the webinar worker manually triggered. No new cron, queue service, monitoring platform, distributed lock service, or general recovery engine is needed.
- Cover actual operations. Static billing, marketing, agent, and approvals examples are not evidence of completed operations and must not produce fabricated audit events.
- Include the minimum schema and persistence repairs needed for CRM, journey maps, and workflow runs to work through Supabase after unsafe memory fallbacks are removed.
- Events with no verified business, including anonymous failed logins, use a validated platform scope in the central audit system. They do not appear in an individual owner's audit viewer.

## Required behavior

- Each signed-in owner accesses only the business belonging to their verified account.
- Business identity, executor identity, initiator identity, and approval authority come from trusted server context.
- Existing business and security changes produce records through the central AuditService contract.
- Audit history remains append-only and contains no credentials or unrestricted input bodies.
- Critical database changes and their required audit records commit together; an audit error must prevent the database change from committing.
- External operations retain accurate records of intent and provider outcomes. An already-sent message or created Meet space cannot be rolled back by throwing a JavaScript error.
- Ordinary owner operations use session-scoped access and RLS. Privileged worker, integration, and identity-provisioning paths have explicit authority and tenant boundaries.

These constraints follow AGENTS.md and the existing single-owner, single-business model.

## Confirmed code findings

- `project/lib/supabase/server.ts`: getSupabaseServerClient returns an admin client, not an authenticated session client.
- `project/services/crm.service.ts`: contact reads, changes, activities, and audit attribution use DEFAULT_BUSINESS_ID; failures can fall back to shared process memory.
- `project/services/workflow-engine.service.ts`: default business context and placeholder owner identities are used; runs and step logs are in process memory.
- `project/services/journey-map.service.ts`: default business context, privileged reads, and shared memory fallback require review.
- `project/services/website.service.ts`: routes resolve the owner, but mutations use privileged access and write separate noncritical audit events afterward.
- `project/services/webinar/*`: owner checks exist in several services; public registration, token storage, attendance, notifications, feedback, and manual worker paths need explicit audit coverage.
- `project/services/audit.service.ts`: withAudit executes the operation and then inserts a log; it does not create a database transaction or roll back a committed change.
- `project/lib/validations/audit.ts`: sanitization redacts sensitive field names, but does not enforce a per-action metadata allowlist.
- `project/supabase/migrations/20261010_audit_logs_schema.sql`: the security-definer audit insertion function accepts supplied tenant and actor values without checking them in its body. The migration does not restrict function execution explicitly; actual deployed grants require inspection.
- The same seeded business identifier is used for tenant fallback and pre-authentication audit events; these authorities must be distinguished.
- `supabase/migrations/001_crm_schema.sql` contains public policies with USING (true) and WITH CHECK (true) for businesses, CRM contacts, and CRM activities. If applied, these policies can defeat stricter owner policies because permissive policies combine with OR. It also adds CRM columns absent from the application migration folder and creates the seeded default business.

## Settled implementation decisions

1. Existing features use the verified owner's business and actual Supabase persistence. The legacy default business remains preserved and excluded from fallback access.
2. Persistence repairs are included only where needed for the existing demo flows: CRM schema compatibility, valid journey-map identifiers/field mapping and saved edits, and saved workflow run/step/approval state.
3. A platform security event may have no business reference. Business events must have a verified business reference. Enforce the distinction through the AuditService contract, database checks, and privileges.
4. Platform events are written only through trusted authentication/security paths and are unavailable to owner audit queries. Do not create an additional audit table or platform administrator UI.
5. Preserve historical audit rows. New code stops using SYSTEM_BUSINESS_ID as a substitute for an unknown tenant; historical rows are not rewritten.
6. Reuse the existing audit viewer and manual webinar worker. Show accurate operation results and a simple Needs review state where necessary.

See [ADR 0001](./adr/0001-platform-security-events-in-central-audit.md) for the platform-event decision.

## Implementation sequence

### 1. Inventory and shared owner context

Inventory route/service operations and record their business resource, actor, initiation source, required audit action, and allowed metadata. Add one server-only owner-context helper using the existing session client and verified auth.getUser() identity. Resolve the business by owner_id. Return explicit authentication, missing-workspace, and database errors.

Update ordinary CRM, workflow, journey-map, website, and webinar operations to use this context. Require id plus business_id for resource lookups and changes. Worker context comes from an authenticated owner request or a validated existing worker secret; public context comes from a validated registration slug or feedback token. Never use a browser-supplied business or actor identifier as authority.

Primary files: project/lib/supabase/server.ts, a shared server-only ownership helper, affected project/app/api routes, and project/services callers.

Acceptance: two owners see their own resources; substituting the other owner's resource ID fails safely; unsigned business APIs return 401; normal services have no DEFAULT_BUSINESS_ID fallback.

### 2. Central audit contract and database permissions

Keep AuditService as the application-facing boundary. Define per-action metadata schemas and apply the existing sanitizer after allowlisting. Derive human identity from the session, retain the initiating owner on AI operations, and record the actual human approver on approval decisions. Store counts, resource references, changed field names, and selected safe status values; exclude credentials, raw prompts, email bodies, feedback free text, and provider payloads from audit metadata.

Close direct client paths for forging historical events. Restrict the audit insertion function and verify authority in approved mutation RPCs. Preserve existing append-only history. Inspect RLS, function execution grants, and parent-child business consistency where these paths are changed. An AuditService wrapper around two HTTP database calls is not a transaction.

Explicitly remove the known legacy allow-all CRM/business policies in a new migration, including when the legacy root migration was already applied. Preserve the seeded business and its rows but deny ordinary fallback access. Add validated platform audit scope, allowing a null business reference only for the restricted platform action set. Owner reads require their actual business ID. Browser callers cannot supply platform authority or audit executor/outcome fields.

Primary files: project/services/audit.service.ts, project/lib/validations/audit.ts, and new versioned project/supabase/migrations files. Existing migrations remain historical.

Acceptance: clients cannot choose another tenant, forge a different executor, update/delete history, or persist metadata outside the allowed contract.

### 3. Minimum persistence repairs

Create additive compatibility migrations under project/supabase/migrations. Consolidate needed CRM columns and crm_activities support from the legacy root schema without recreating its allow-all policies. Align webinar-created contacts with the CRM stage/status representation so registered leads can appear in the existing owner CRM view.

Use database-compatible UUIDs and map journey-map schema fields to the UI contract explicitly. Persist real stage changes through authenticated APIs; do not mark proposed module actions as deployed effects. Save workflow runs, step outcomes, and approval state using the existing workflow tables, with parent-child ownership validation and sanitized operational data. Keep current manual triggering and existing workflow capabilities; unsupported capabilities must return an honest result.

Remove shared process-memory storage from ordinary business paths once these replacements work. Keep local UI form state. This does not require a new scheduler, event bus, automatic resume mechanism, or full DAG execution redesign.

Acceptance: a contact, edited journey, and workflow awaiting approval survive a page reload and remain visible only to their owner.

### 4. Atomic database changes with audit records

Use small operation-specific Postgres RPCs for related changes and their required audit records in one transaction. AuditService validates and sanitizes the action context before delegating to the corresponding mutation RPC; it must not become a generic client-controlled SQL dispatcher. Reuse one internal audit insertion routine within those transactions. PostgreSQL ownership checks remain authoritative for owner RPCs.

Apply to CRM changes and notes, website create/save/publish/delete, webinar and series changes, registration/feedback operations, journey-map changes, and workflow definition/run/approval changes. Ensure an audit insertion error rolls back the affected database operation. Treat scope-approved persistence repairs as prerequisites rather than a separate product redesign.

Acceptance: a forced audit-write failure leaves the target business record unchanged; successful changes leave a real event with the correct business, resource, and executor.

### 5. External actions and manual delivery

Before sending a message or provisioning Meet, persist the authorized request and an audit event describing its intent. Use existing operation/outbox references and idempotency keys. Record provider acceptance, confirmed failure, or an uncertain outcome accurately. If the provider action may have happened and local finalization fails, keep Needs review and report that state instead of claiming rollback or confirmed success.

Google token connection/replacement produces a credential-change event without storing token contents in metadata. Attendance import records one event per user-triggered import batch/outcome rather than one event per fetched row. Public registrations, consent changes, feedback submissions, follow-up review/scheduling, manual worker batches, and individual email outcomes have explicit actions in the coverage inventory.

Acceptance: the owner can demonstrate registration, attendance import, reviewed follow-up scheduling, manual email processing, and their audit trail. Unknown provider outcomes remain visible with a reference for manual review.

### 6. Focused verification and demo

Add meaningful coverage through public service/API seams for two-owner isolation, anonymous requests, parent-child resource checks, public registration/feedback authorization, manual worker scope, audit metadata filtering, immutable history, and mutation rollback. Run focused tests, then repository lint and production build. Check the final diff for unrelated files and exposed secrets.

Provide the exact new migrations in execution order and explain any live Supabase checks the developer must perform if remote database access is unavailable. Regenerate database types when tooling permits. Demonstrate with two test owners and synthetic business records; do not send messages to real customers during verification.

### Migration handoff

1. Preserve existing database records and inventory which legacy/app migrations are installed.
2. Apply newly authored compatibility and isolation migrations, then the central audit permission/scope changes and audited mutation RPCs, following the dependency order documented alongside the actual new files.
3. Do not rerun the legacy root CRM migration after the isolation migration, because it can restore public allow-all policies.
4. Verify owner RLS, function grants, and two-account reads before demonstrating write flows. The plan does not claim that local migration files have already been applied to Supabase.

Exact migration filenames will be assigned during implementation; this plan does not instruct the developer to execute files that do not yet exist.

## Feature audit inventory to complete during implementation

| Feature | Required actions and authority |
| --- | --- |
| Authentication | Signup/business provisioning, login/logout, rejected authentication; verified identity where available, platform security scope otherwise |
| Google connection | Connection/reconnection and credential replacement; verified owner or trusted refresh process, zero token metadata |
| CRM | Contact create/update/stage change/delete and manual note changes; owner or attributed AI executor |
| Websites | Create/save/publish/unpublish/delete; verified owner and affected site |
| Webinars and series | Create/edit/schedule/reschedule/cancel/delete; owner and affected resources/counts |
| Public registration | Registration and separate marketing consent; validated public link, server-resolved business, public registrant distinct from business owner |
| Attendance | Import start/result and participant match/review; owner-triggered integration and human reviewer |
| Feedback | Submission and consent changes; validated feedback token and server-resolved registration |
| Follow-ups and notifications | Draft changes, owner review/scheduling, queued delivery and provider outcomes; owner, system worker, and provider identities kept distinct |
| Journey maps | Creation and actual saved edits/actions; owner, with proposals not recorded as executed effects |
| Workflows | Definition changes, run start/steps/result, approval/rejection, external effects; initiating owner, AI executor, and human approver |
| Security | Actual rejected tenant/authorization attempts; requesting identity where verified, no other tenant's sensitive details |

Ordinary reads, pageviews, filter changes, keystrokes, and diagnostic messages are not audit events. Routine bookkeeping can remain operational records when it does not itself represent a business/security change.

## Scope limits

This plan secures and audits existing functionality. It does not implement billing, a general campaign editor, public website hosting, predictive journey analytics, full DAG branching/delays, or a new approval dashboard. Necessary changes to show accurate existing action outcomes are included.

All design questions raised in the interview are settled. Review this scope as the shared understanding before application implementation, as required by the grilling workflow. No ADR is needed for routine helper/API choices.
