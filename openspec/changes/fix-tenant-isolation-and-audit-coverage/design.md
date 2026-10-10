## Context

Nexus is a Next.js App Router hackathon application under `project/`, using Supabase Auth/Postgres, TanStack Query, Zod, Google Meet, and existing email integrations. The owner has approved a development-focused repair of tenant isolation and central audit coverage across all existing operations, including the minimum persistence repairs necessary for the current demo.

Observed code differs from the intended architecture:

- `getSupabaseServerClient()` returns a service-role client; CRM and workflow services use a default business and process-memory fallbacks. Journey reads can be privileged and unscoped.
- The legacy root CRM migration defines public allow-all policies and compatibility columns missing from the application migration folder. Permissive policies can combine with stricter policies, so changing only application query filters is insufficient.
- AuditService accepts caller-supplied identity/outcome and frequently runs after a separate mutation; `withAudit()` is not a transaction. The audit insertion function is security-definer and does not verify the supplied authority in its body.
- The existing audit schema requires a business even for anonymous authentication failures; the accepted ADR replaces new fictitious-business events with restricted platform scope.
- Journey records use non-UUID identifiers and return raw database shapes inconsistent with UI fields. Stage edits are local; approved suggestions return hard-coded deployment messages.
- Workflow definitions can persist, but runs, step logs, and approvals use memory. The existing run detail page keeps active-run selection only in local component state.
- Webinar ownership and outbox paths already exist. Their public token checks, recipient review, provider uncertainty states, and manual worker behavior must be preserved while adding audit coverage.

There are no established main specs under `openspec/specs/`. The separate webinar change contains owner isolation, approval, public registration, optional follow-up, and honest-outcome requirements. This change strengthens the shared implementation without altering those product decisions. Reference: [agreed plan](../../../docs/security-and-audit-plan.md) and [ADR 0001](../../../docs/adr/0001-platform-security-events-in-central-audit.md).

## Goals / Non-Goals

**Goals:**

- Demonstrate actual persisted records, approvals, and accurate audit history for the signed-in owner's business.
- Use one verified ownership boundary, session RLS for ordinary reads, and checked transactional mutation entry points.
- Record executor, initiator, approver, resource, and outcome through one shared audit contract with safe metadata.
- Preserve default-business data and immutable history while removing implicit access and forged event paths.
- Repair current CRM, journey, and workflow persistence sufficiently for a two-owner demo and page reloads.
- Retain simple manual controls and existing services rather than adding production infrastructure.

**Non-Goals:**

- Implement billing, a general campaign editor, public website hosting, predictive journey analytics, or the static agent/approval examples.
- Introduce teams/RBAC, business switching, another OAuth flow, a scheduler, an event bus, distributed retry orchestration, monitoring infrastructure, or a platform administrator UI.
- Complete DAG branching, real deferred delays, automatic event dispatch, or recovery of interrupted workflows. Existing unsupported capabilities must be reported honestly.
- Guess ownership of legacy records or rewrite old audit entries.

## Decisions

### 1. One server-only owner context, with distinct public and worker entry points

Add a small shared owner-context helper under `project/lib/` or `project/services/` that creates the existing session client, verifies `auth.getUser()`, and resolves the unique business by `owner_id`. Return the client, user ID, business ID, and request/correlation context. API handlers validate payloads and pass trusted context to services; service callers cannot omit context or get a default tenant. Validate route resource IDs together with that context.

Ordinary owner reads use the session client and an explicit business filter. Owner mutation RPCs derive/verify identity again using `auth.uid()`. Public registration/feedback use their checked slug/token RPCs; they do not receive private owner authority. Manual owner workers use session-derived business context; internal workers use the existing secret and business IDs from claimed persisted jobs.

Alternative: keep admin clients and add filters independently at every call site. Rejected because the default context and mixed caller identity remain easy to misuse, and RLS would not protect ordinary access. Do not introduce a general authorization framework.

### 2. Remove unsafe legacy policies and enforce parent-child consistency

Create additive migrations in `project/supabase/migrations` that remove the known allow-all policies from the root CRM migration and install owner restrictions for affected business records. Verify same-business relationships for activities/contacts, webinar child records, journey records, and workflow runs/steps using composite keys where compatible or explicit checks in the narrow mutation RPCs. Preserve existing legacy records; invalid existing relationships must be reported for repair rather than silently reassigned.

Audit and sensitive execution state are read through owner policies; writes are limited to the checked mutation paths. Do not leave a generic browser-writeable workflow-run or approval table that lets an owner manufacture executor/approval attribution. Security-definer functions have explicit execution grants, fixed safe search paths, and identity/resource checks; internal audit and executor functions are not public RPCs. Trusted AI executor paths derive owner/approver context from the validated persisted run rather than accepting arbitrary actor claims.

Alternative: rely on query filters only. Rejected because directly reachable Supabase tables/functions and permissive legacy policies can bypass those filters.

### 3. Central audit contract with restricted platform scope

Keep AuditService as the application interface and the existing `audit_logs` table as the record store. Define a closed per-action metadata schema/catalogue in the validation layer, apply allowlisting then sanitization, and make authoritative identity a product of trusted context rather than an arbitrary request payload.

Business events require a business reference. A constrained platform security event permits a null reference and is written only by trusted authentication/security paths. Restrict allowed platform actions in both the application contract and database function/checks; a null business must not become a way to log an unauthenticated business mutation. Owner audit queries always filter their non-null business ID. Existing rows using SYSTEM_BUSINESS_ID remain untouched. No new owner screen for platform events is added.

Authenticated browser clients lose direct audit INSERT permission and unrestricted audit-RPC execution. Owner mutation functions derive the human identity and construct the event from their actual operation. SQL functions used by public RPCs and identity provisioning share the internal audit insertion routine and action metadata contract; they do not pretend to call TypeScript from PostgreSQL. AuditService is the central application seam, while the internal SQL routine supplies the transactional database seam.

Alternative: a second platform audit table or new fake business. Rejected by the accepted ADR because both fragment or misrepresent the history. Alternative: keyword redaction alone. Rejected because innocently named unrestricted fields can carry credentials or raw message/prompt content.

### 4. Small transactional mutation RPCs, not a JavaScript rollback claim

Use operation-specific RPCs for critical mutations and required audit entries. Domain services continue to own use-case orchestration and invariants; AuditService owns action/metadata validation and audited RPC invocation support. Each database function enforces the relevant authority and inserts through the same private audit routine within its transaction. Existing public registration/feedback functions and identity provisioning triggers are extended rather than replaced with multi-call transactions.

A required audit insertion error rolls back the database mutation. Translate failures into safe API errors and propagate AuditLoggingError at the service seam. Remove business uses of noncritical synthetic audit fallbacks and stop advertising `withAudit()` as atomic. Do not report a denied request as permitted merely because its denial event cannot be saved.

Alternative: mutation plus a later separate AuditService insert. Rejected because a late exception cannot undo a committed mutation. A generic client-controlled SQL/action dispatcher is also rejected; RPCs accept narrow validated operation inputs and derive authoritative event data.

### 5. Minimum persistence repair alongside isolation

For CRM, add missing current fields and `crm_activities` support without importing root allow-all policies. Preserve the webinar normalized-email index and match existing status/stage semantics so public registrations become visible owner leads. Choose explicit backfill mappings for known existing stage/status values; report unknown values rather than inventing their meaning.

For journeys, use UUIDs, save the map/stages/proposed actions consistently, and provide explicit database-to-UI mapping for archetype/journey type, metadata/summary, description/objective, and pain/friction fields. Add narrow authenticated stage mutation APIs and TanStack hooks for the existing UI operations. Store an approved suggestion as a proposal approval unless a supported execution path actually runs; remove invented deployment results.

For workflows, reuse `automation_workflows`, `workflow_runs`, and `workflow_step_logs`. Save run/step state and verified initiator/approver references; add only fields/policies needed for that state. Existing run inspection and approval endpoints load owned database records and verify the run belongs to the route workflow. The detail page restores the latest relevant run on reload, so an approval gate can be demonstrated after refresh. Keep the current manual execution model; unsupported capabilities and simulations have explicit results, never fake real side effects.

Alternative: keep tenant-partitioned memory for the demo. Rejected because the owner approved persistence repairs, memory loses the state needed to demonstrate approvals/audit consistently, and it adds a second source of truth. Full workflow redesign is outside scope.

### 6. Persist external intent and show simple uncertain results

Use existing outbox/provisioning/run references and provider idempotency keys. Persist authorized intent and its audit record before consequential provider calls. Record acceptance, confirmed failure, or unknown state against that reference afterward. Preserve provider-accepted versus delivered semantics; this change does not claim delivery from an acceptance response.

For local finalization failure after a provider call, retain a persisted in-flight/unknown record and return Needs review with the available reference. Do not erase evidence, report rollback, or introduce an unsafe resend. Reuse existing webinar/Meet operation states and show a small status/error adjustment in the affected screen. If no reconciliation control exists, the demo guide describes a manual provider/database review; no general recovery dashboard is required.

Google credential connection/replacement records a safe credential event with no token contents. Attendance emits start/result at the import-batch level; participant review and consent changes have their own business events. Workflow notification calls carry owned recipient/resource context and stable persisted operation keys; distinguish provider calls, simulations, and unsupported steps.

Alternative: automatically retry every unknown outcome. Rejected because Meet creation may not offer the same idempotency behavior as email sending. Existing safe provider retries can remain, without adding a scheduler or general retry engine.

### 7. Preserve the current UI and use focused checks

Reuse existing audit filters/record inspector and owner forms. Audit query payloads use Zod and safe API errors. Add UI/hooks only where persisted journey edits, run restoration, and truthful outcome status require them. Follow DESIGN.md and the local Next.js documentation when changing route/data behavior.

Verification focuses on two-owner isolation, direct database/RPC authority, mutation rollback, metadata restrictions, persisted reload behavior, and the existing webinar registration-to-follow-up path. A mocked audit insert alone cannot prove database rollback; include a real local/test Supabase SQL check or an explicitly pending manual live check. Use synthetic recipients/test provider modes; no automatic sending to real customers.

## Risks / Trade-offs

- [The live database may contain root CRM policies or only application schemas] → Inspect installed schema/grants before deployment; author compatibility migrations that handle both known layouts without destructive resets.
- [Existing unrelated data violates a new same-business constraint] → Report the specific relationship for manual repair; do not delete or guess ownership.
- [Postgres and TypeScript share action metadata rules] → Keep one documented action catalogue and focused parity checks; SQL must reject bypass payloads even when called directly.
- [All-module audit coverage touches shared services] → Implement vertical slices with scoped changes, preserve current module interfaces where practical, and test owner boundaries before extending each slice.
- [External calls cannot be rolled back with Postgres] → Persist intent first, show Needs review, and retain existing manual/provider references.
- [Workflow capability behavior remains limited] → Persist honest results and explicitly describe unsupported/simulated actions; do not equate run bookkeeping with implemented billing or automation features.
- [Schema/function changes temporarily mismatch application code] → Apply documented migrations immediately before compatible app code; old code is allowed to fail safely rather than restoring insecure permissions.
- [A hackathon environment lacks live database tooling] → Provide exact migration and SQL verification steps, and distinguish local checks from unperformed Supabase checks.

## Migration Plan

1. Check the installed database tables, policies, RPC grants, and current legacy rows without printing credentials or modifying business records.
2. Author new app migrations in dependency order: CRM/journey/workflow compatibility; owner relationship/policy restrictions; validated nullable platform audit scope and restricted internal audit routine; audited mutation/public/worker functions. A small number of files can group related operations; assign exact names during implementation.
3. Preserve existing audit rows and seeded business data. Do not rerun root `001_crm_schema.sql` because it can restore allow-all policies. Do not edit previously applied migration history.
4. Apply the new migrations, regenerate TypeScript database types when access/tooling permits, and deploy the compatible context/service/API changes.
5. Verify with two test owners: CRM/website/journey/run access, one saved journey edit, a workflow approval after reload, public webinar registration, and manual worker business scope. Verify audit attribution, no platform events in owner results, immutable rows, and an induced audited-mutation rollback.
6. Document exact files and remaining manual SQL/provider checks if remote execution is unavailable. Do not claim the migration was applied based on local file creation.

Rollback uses a forward correction or the pre-change database backup where needed; it does not reintroduce permissive policies or rewrite historical audit events. Pause the demo if incompatible application code would perform an unsafe operation. No automatic rollback/recovery system is introduced.

## Open Questions

All product/scope decisions are settled. Implementation must inspect the actual installed Supabase migration state and any invalid legacy parent-child rows before applying constraints; these are environment checks, not deferred product design. Exact migration filenames and type-generation commands will be recorded once the implementation files exist.
