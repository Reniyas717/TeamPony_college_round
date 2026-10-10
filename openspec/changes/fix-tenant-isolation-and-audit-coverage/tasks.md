## 1. Shared verified owner context

- [x] 1.1 Add a server-only owner-context helper using the existing session client, auth.getUser(), and business owner lookup, with safe unauthorized/not-found/database errors.
- [x] 1.2 Require verified context in ordinary CRM, website, webinar, journey-map, workflow, and audit service interfaces; remove guessed default-business parameters and ordinary admin-client fallback access.
- [x] 1.3 Authenticate all existing private API routes, including workflow generation/trigger/run inspection/approval and journey APIs; validate route/body inputs and use server-derived business context.
- [x] 1.4 Preserve the existing public slug/token boundaries and owner/internal manual-worker authority; check every child identifier against the owned parent and business.
- [ ] 1.5 Add focused API/service checks for anonymous rejection and two-owner resource isolation, including a run ID that does not belong to its route workflow.

## 2. Database compatibility and isolation

- [x] 2.1 Author an additive app migration for missing CRM fields and crm_activities support, preserving normalized-email uniqueness and mapping current status/stage values without importing permissive root policies.
- [x] 2.2 Add only the journey-map and workflow schema fields needed for explicit UI mapping, valid persisted IDs, initiation/approval context, and run restoration.
- [x] 2.3 Remove the known legacy allow-all businesses/CRM policies and install scoped policies and parent-child constraints or checked function logic for affected records; preserve seeded business data and report invalid legacy relationships.
- [ ] 2.4 Restrict direct writes to authoritative audit/run/approval state and checked business mutation paths; set explicit function grants and safe search paths, including public and worker RPCs.
- [x] 2.5 Supply database checks that distinguish owner A, owner B, and anonymous access after both known migration histories, without resetting or reassigning existing data.

## 3. Central audit contract and platform scope

- [x] 3.1 Define the concrete action catalogue and metadata allowlists for every existing operation listed in the proposal; distinguish actual effects, approvals, provider uncertainty, and simulation.
- [x] 3.2 Refactor audit validation/service input to derive trusted business, executor, initiator, and approver context, enforce per-action metadata rules, and sanitize before persistence.
- [x] 3.3 Add a restricted platform-security scope with a nullable business reference, validated allowed actions, and trusted server-only writing; stop new SYSTEM_BUSINESS_ID substitution while preserving historical rows.
- [x] 3.4 Restrict the internal audit insertion routine and direct table INSERT, retain immutable history protection, and enforce metadata/authority checks in callable mutation RPCs.
- [ ] 3.5 Add audited transactional RPC support at the AuditService seam; remove critical-operation use of synthetic audit fallbacks and correct or replace the nontransactional withAudit contract.
- [ ] 3.6 Verify platform-event validation, owner exclusion, forged actor/outcome rejection, metadata filtering, immutable rows, and safe denial behavior when logging is unavailable.

## 4. CRM persistence and audited mutations

- [ ] 4.1 Replace CRM contact/activity memory stores with scoped Supabase reads and persist current contact fields, notes, and stage changes through narrow audited mutation RPCs.
- [x] 4.2 Return explicit failed-save/not-found results and compute existing CRM statistics only from the owner's persisted records.
- [x] 4.3 Ensure webinar registration-created/reused contacts share the current CRM stage/status mapping and appear in the correct owner's CRM without duplicating normalized emails.
- [ ] 4.4 Verify contact creation, edit, stage change, note, and deletion attribution plus an induced audit failure that rolls back a contact mutation.

## 5. Authentication, Google connection, and websites

- [x] 5.1 Update signup/business provisioning, login/logout, OAuth callback, and actual rejected-authentication paths to use verified business events or restricted platform events as appropriate, without inventing a verified actor before login.
- [x] 5.2 Record Google connection/reconnection and credential replacement through the central contract while retaining existing encrypted storage/refresh and excluding credentials from metadata.
- [x] 5.3 Move website create/save/publish/unpublish/delete to checked owner mutation RPCs that commit required audit entries atomically; preserve the existing editor and preview behavior.
- [ ] 5.4 Verify authenticated website isolation and rollback, authentication/platform attribution, and absence of provider tokens/raw prompts in audit records.

## 6. Webinar lifecycle, registration, attendance, and feedback

- [ ] 6.1 Add audited transactional paths for session/series create/edit/schedule/reschedule/cancel/delete while preserving recipient previews, version checks, shared-contact retention, and existing deletion safeguards.
- [ ] 6.2 Extend existing public registration and feedback RPCs with the shared internal audit contract for registrations, related CRM changes, feedback submission, and distinct marketing consent; preserve capacity, duplicate, token, and session-selection rules.
- [ ] 6.3 Add attendance import intent/batch-result events and atomic participant-review events with actual integration/reviewer attribution, avoiding per-fetched-row audit noise.
- [ ] 6.4 Persist and audit Meet provisioning intent/outcome around the existing provider call; keep uncertain creation outcomes blocked from unsafe automatic re-creation and visible as Needs review.
- [ ] 6.5 Verify public/private separation, series session selection, consent separation, attendance review ownership, lifecycle audit entries, and transactional rollback for a public registration audit failure.

## 7. Follow-ups, notifications, and manual email processing

- [ ] 7.1 Make reviewed follow-up draft/settings and scheduling changes use audited consistent writes while preserving optional enablement, attendee/no-show segmentation, recipient snapshots, and eligibility/version checks.
- [ ] 7.2 Record event notification/outbox creation and authorized delivery intent using existing persisted job references and idempotency keys; keep event notifications independent of optional follow-ups.
- [ ] 7.3 Audit manual owner/internal worker processing and individual provider outcomes without adding cron; preserve business-scoped claims and accurately distinguish provider acceptance, confirmed failure, and uncertainty.
- [ ] 7.4 Expose a simple Needs review result with available operation references when external finalization is uncertain, and document manual provider/database review instead of implementing a recovery dashboard.
- [ ] 7.5 Verify two-owner manual-worker scope, approved follow-up eligibility, optional-follow-up behavior, and a provider-accepted/local-finalization-failed result without sending to real recipients.

## 8. Journey-map persistence and honest action results

- [x] 8.1 Replace journey/map/stage/action memory storage and non-UUID IDs with scoped consistent persistence; map archetype, summary, objective, friction, evidence, and action result fields explicitly to the current UI contract.
- [x] 8.2 Add narrow authenticated stage add/edit/delete APIs, validation, and TanStack hooks; connect existing UI controls to persisted mutations with loading/error handling.
- [x] 8.3 Persist journey proposal approval/dismissal and central audit events; remove invented deployment messages and report approval without claiming an unsupported module effect.
- [ ] 8.4 Verify saved journey content/order and stage edits after reload, cross-owner rejection, and truthful approved-proposal results.

## 9. Workflow run persistence and audited execution

- [x] 9.1 Persist owned workflow definitions, manually triggered runs, step outcomes, and initiation/approval references in the existing workflow tables; replace memory-backed reads and IDs with database records.
- [ ] 9.2 Persist the current approval position and verified approval/rejection transitions through checked audited RPCs; ensure the run belongs to the route workflow and old step outcomes are not overwritten as new execution.
- [x] 9.3 Restore the latest relevant run and its inspector/approval state through existing hooks and the workflow detail page after reload.
- [ ] 9.4 Pass trusted owned context to existing CRM/notification executor capabilities, preserve the AI executor and initiating/approving owner in audit events, and correlate external intent/outcomes with persisted step references.
- [x] 9.5 Store honest unsupported/simulated capability results and safe failures instead of generic real-effect success; retain the manual demo execution model without implementing full DAG branching, delays, or automatic event dispatch.
- [ ] 9.6 Verify run/approval persistence after reload, approval rejection by another owner, real versus simulated attribution, and no fabricated successful effect for an unsupported capability.

## 10. Audit viewer and final verification

- [x] 10.1 Use validated query filters and safe errors in the existing audit API/viewer; confirm it returns only the verified owner's business events and excludes platform events.
- [ ] 10.2 Complete the concrete feature/action/metadata coverage matrix and check existing mutation/provider paths against it, including rejected tenant requests without exposing the target tenant's sensitive details.
- [ ] 10.3 Run meaningful focused tests and database checks for two-owner isolation, direct table/RPC authority, audit rollback, immutable history, metadata parity, and reload persistence; clearly record any live checks that cannot run locally.
- [ ] 10.4 Run repository lint and production build, review the final diff for unrelated changes/secret exposure, and keep required Next.js/DESIGN.md conventions on changed UI/data-loading paths.

## 11. Migration and hackathon demonstration handoff

- [ ] 11.1 Document actual new migration filenames and dependency order, installed-schema inspection steps, and the instruction not to rerun the legacy root CRM migration after isolation fixes.
- [x] 11.2 Apply new migrations only when the target database is available and execution is authorized; otherwise provide the exact manual steps and report remote application as pending. Regenerate database types when tooling/access permits.
- [x] 11.3 Provide a short two-owner demo script covering a saved CRM lead, website change, journey edit, workflow approval after reload, webinar registration/attendance/follow-up, manual email processing, and matching audit records.
- [x] 11.4 Report achieved behavior and explicit remaining provider/live-database prerequisites without claiming new billing, campaign, hosting, prediction, or full workflow capabilities were implemented.
