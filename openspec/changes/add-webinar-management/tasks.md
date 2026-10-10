## 1. Implementation prerequisites and shared seams

- [x] 1.1 Read the installed Next.js routing, cookies, cache-components, and Suspense guides before implementation; restore dependencies if the bundled docs are missing.
- [x] 1.2 Reconcile the current CRM contact/consent seam with CRM_README.md and any teammate-delivered migration; record the actual business + normalized-email contract without introducing new lifecycle enums.
- [x] 1.3 Document server-only configuration names for the email sender/API key, public app URL, worker invocation, and worker authentication; reuse the existing Google OAuth configuration without creating another set of credentials.
- [ ] 1.4 Add a minimal meaningful service/API/SQL test harness with a disposable Supabase database and external-provider test doubles; use a small test runner only if none has landed.

## 2. Owner-scoped session foundation

- [ ] 2.1 Write failing public-seam tests for owner isolation, unscheduled drafts, invalid timezone/schedule input, and another business's entity IDs.
- [x] 2.2 Add a versioned migration extending webinars for drafts, presenter/timezone, series membership, public slugs, capacity/deadline, product URL, follow-up selection, and optimistic versioning; preserve initial migration and existing rows.
- [ ] 2.3 Add webinar_series and all required private relationships with business-scoped foreign keys, indexes, check constraints, and RLS; verify anonymous callers cannot read private rows.
- [ ] 2.4 Implement verified business context, Zod contracts, session/series service methods, and owner API routes using standardized responses; make the tests in 2.1 pass.
- [x] 2.5 Add TanStack query-key families/hooks and reuse or introduce the minimal scoped QueryClient provider required by the owner module.
- [x] 2.6 Build the protected list, creation/edit forms, series management, and Overview/Registration/Attendance/Follow-up/Analytics detail tabs; link the existing dashboard webinar tile and reuse the available shell/primitives.

## 3. Durable work and email delivery foundation

- [ ] 3.1 Write failing seam tests for transactional job claims, duplicate effect keys, unknown external outcomes, and stale/expired leases.
- [x] 3.2 Add versioned work/outbox schema and bounded claim/lease/retry RPCs with RLS, business references, immutable payload identity, due-time indexes, and safe terminal outcomes.
- [x] 3.3 Implement the bounded worker service inside Next.js and its machine-authenticated /api/internal/webinar-work Route Handler; reject unauthenticated or client-invented tasks.
- [x] 3.4 Implement a small fetch-based Resend adapter with stable provider idempotency keys, provider IDs, retry backoff, 24-hour unknown-outcome safeguards, and safe failure messages.
- [x] 3.5 Add verified email-status webhook handling and replay protection, or leave delivery explicitly provider-accepted until delivery verification exists; never label acceptance as inbox delivery.
- [x] 3.6 Add a signed-in owner manual trigger for bounded email work, scoped to the verified business through a dedicated claim RPC. Defer Cron/pg_net for the hackathon.

## 4. Existing Google OAuth integration and Meet scheduling

- [ ] 4.1 Inspect the existing Supabase Google sign-in and callback contract; add failing tests at the existing integration seam for owner/business binding, granted Meet access, reconnect state, and token-free status, plus duplicate scheduling and ambiguous Meet creation.
- [x] 4.2 Integrate through the existing Supabase sign-in callback and expose only safe connection status; add no second OAuth flow or callback.
- [x] 4.3 Extend the existing Google sign-in request with the least-privilege Meet scope and add encrypted server-side provider-token storage/refresh within that same flow.
- [x] 4.4 Implement the server-only Meet adapter and provisioning worker; create a distinct space per session, persist results before scheduling success, reuse on reschedule, and hold unknown outcomes for reconciliation.
- [x] 4.5 Connect scheduling/Google status to the owner UI; prevent public registration before successful scheduling and show configured/reconnect/provisioning/failed states honestly.
- [ ] 4.6 Verify the real demo Google account can authorize the scope and create a Meet space, documenting setup or account restrictions instead of substituting fake success.

## 5. Atomic native registration and shared contact linkage

- [ ] 5.1 Write failing database/API scenarios for concurrent final-place requests, duplicate/retried email submissions, deadline races, invalid series membership, and anonymous access to private data.
- [x] 5.2 Add webinar_registrations and independent shared marketing-consent records, normalized-email constraints, contact links, and indexes; stop migration on conflicting contact duplicates with a remediation report.
- [ ] 5.3 Implement narrow public-projection and registration RPCs with fixed search_path, explicit execute grants, SQL input validation/abuse controls, stable lock ordering, and atomic series reservations/contact resolution/confirmation enqueue.
- [x] 5.4 Add Zod-validated public registration API routes and ingress throttling; resolve business and session scope from public references rather than client authority.
- [x] 5.5 Build standalone/series public forms with name/email, available session selection, capacity/deadline states, an unchecked marketing choice, localized times, and server-confirmed success.
- [x] 5.6 Add registration confirmation templates with Meet link/timezone and business sender/reply-to; prove follow-up selection does not control confirmations and provider failure does not undo reservations.

## 6. Reviewed reschedule and cancellation

- [ ] 6.1 Write failing tests for stale recipient previews, cancellation with follow-ups disabled, reschedule consistency, and preservation of cancelled-session records.
- [ ] 6.2 Implement owner review previews and version/snapshot-checked commit RPCs that atomically update schedules/status and queue affected-recipient notifications.
- [x] 6.3 Implement independent reschedule/cancellation templates and notification outcome tracking; stop pending follow-ups on cancellation.
- [x] 6.4 Add accessible confirmation UI showing exact action, changed times, recipients/counts, and consequences; refresh stale previews and render cancelled sessions with the retained-history banner.

## 7. Exhaustive Meet attendance and identity review

- [ ] 7.1 Write failing import-service scenarios for pagination at every level, repeated joins, overlapping devices, anonymous/phone/unregistered participants, partial failure, active conferences past planned end, and missing records.
- [x] 7.2 Add conference/participant/join-session/import-checkpoint tables with stable provider identities, nullable registration mapping, owner review disposition, business foreign keys, and RLS.
- [x] 7.3 Implement bounded conference/participant/join-session paging, checkpoint resume, upserts, provider retention-aware retries, and preservation of owner review decisions.
- [x] 7.4 Implement any-entry attendance, actual-ended/import-complete gating, reliable identity matching, manual link/host/unregistered classification, no-show finalization, and approval invalidation after corrections.
- [x] 7.5 Build Attendance views with all imported participants, join/leave details, unresolved-review actions, sync timestamps, complete/partial/failed status, and separate registrant/participant counts.
- [ ] 7.6 Run a controlled real Meet with several entrants and at least one re-entry; compare all accessible provider pages against persisted records and verify uncertain identities remain visible.

## 8. Optional reviewed follow-ups

- [ ] 8.1 Write failing seam tests for disabled follow-ups, pre-end scheduling/dispatch, incomplete attendance, unresolved reviews, stale approvals, changed audiences, and attendee/no-show segmentation.
- [x] 8.2 Extend existing marketing_campaigns with nullable webinar ownership and add webinar_followups metadata linking separate attendee/no-show drafts, approved content revisions, recipient snapshots, due times, and eligibility versions.
- [x] 8.3 Implement draft creation, editable templates, explicit review/approval and scheduling APIs; gate approval/scheduling on ended session and resolved attendance and preserve separate future marketing consent.
- [x] 8.4 Implement dispatch-time rechecks of session existence/status, follow-up selection, approval version, due time, attendance completeness, and eligibility before queuing/sending each recipient.
- [x] 8.5 Build the optional follow-up toggle, audience/template review, scheduling control, blocking reasons, recipient outcomes, and partial-failure display; disabling cancels pending follow-ups only.

## 9. Participant feedback and product interest

- [ ] 9.1 Write failing scenarios for invalid/deleted feedback tokens, cross-participant scope, repeated submissions, product interest without marketing consent, and unsafe product URLs.
- [x] 9.2 Add participant/session feedback records and hashed cryptographic tokens with RLS/uniqueness; implement narrowly scoped public feedback RPCs and API contracts.
- [x] 9.3 Build the public feedback page with 1–5 rating, usefulness, optional comment, product interest, separate unchecked marketing opt-in, and optional validated HTTPS product link.
- [x] 9.4 Personalize attendee follow-ups with feedback links; keep no-show wording separate and persist affirmative marketing consent outside webinar-specific response records.
- [x] 9.5 Add owner feedback response views and Analytics tab counts with denominators; keep interest distinct from actual purchase/subscription conversion.

## 10. Permanent deletion and worker safety

- [ ] 10.1 Write failing scenarios for session/series deletion, cross-owner deletion, shared-contact/consent preservation, token invalidation, pending email cancellation, and concurrent in-flight effects.
- [x] 10.2 Implement confirmed transactional session/series cascade deletion, webinar-owned campaign removal, pending-work invalidation, and retryable conflict for active/unknown external operations.
- [x] 10.3 Add deletion preview/confirmation counts and permanent consequences to the owner UI; clearly preserve cancelled histories and avoid claims of retracting already-sent mail or provider history.
- [ ] 10.4 Prove successful deletion leaves no webinar-owned private records or dispatchable work and cannot delete unrelated sessions, CRM contacts, consent, or the owner's Google connection.

## 11. Completion verification and handoff

- [ ] 11.1 Run the full controlled lifecycle: login → create series/session → schedule Meet → register chosen sessions → receive independent notifications → import/review attendance → optionally approve/schedule follow-ups → submit feedback and inspect results.
- [ ] 11.2 Exercise no-follow-up, reschedule, cancellation, capacity/deadline, provider-failure/reconnect, unmatched-participant, retry, and permanent-deletion paths against the capability scenarios.
- [ ] 11.3 Verify responsive list/detail/public forms, keyboard/focus behavior, timezone labeling, loading/empty/error states, actual metrics, and reduced motion using DESIGN.md.
- [ ] 11.4 Run meaningful service/API/database tests, npm --prefix project run lint, and npm --prefix project run build; resolve failures and record actual results.
- [ ] 11.5 Regenerate/check database TypeScript types, inspect secrets and client bundles for exposure, and review git status/diff for unrelated changes.
- [ ] 11.6 Document the existing Supabase Google sign-in scope and encrypted token vault, sender/manual-trigger setup, configuration names, safe retry/reconciliation behavior, deployment limits, and operational demo instructions; update the source requirements' implementation status only after verified completion.
