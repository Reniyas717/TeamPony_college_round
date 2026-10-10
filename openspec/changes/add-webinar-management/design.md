## Context

The accepted product source is docs/webinar-management.md and the terminology is CONTEXT.md. The user approved the complete scope before requesting this change.

Observed repository state:
- The entire application, including pages, API routes, OAuth callbacks, and background worker code, runs in the Next.js app in project/. Login/signup/session API routes, AuthService, cookie-based Supabase factories, and a protected dashboard exist. Runtime auth behavior has not been verified. Supabase is the database and may schedule requests to a Next.js endpoint; it does not host application code.
- public.businesses already enforces one owner per business. The initial migration creates crm_contacts, marketing_campaigns, and webinars with owner RLS; webinars currently requires scheduled_start and has no series, registration, attendance, feedback, or delivery model.
- Supabase, TanStack Query, Zod, and Iconsax are now listed in package.json. React Hook Form and its Zod resolver are not listed. A QueryClient provider, webinar service, email worker, and Google API token capability were not present when inspected. Supabase Google sign-in and its PKCE callback are present. The feature extends that login with the Meet scope and stores Google provider tokens encrypted server-side because Supabase does not refresh them.
- CRM_README.md describes planned richer contact fields/stages, while the actual migration still uses status and a nonunique business/email index. No CRM implementation was present in the inspected inventory. Integration must follow the actual shared contact seam as it lands, without inventing a competing taxonomy.
- DESIGN.md §15.5 prescribes the webinar list/detail pattern, timezone presentation, states, and reviewed campaigns. Its visual registration editor and reminders/export are broader than the confirmed fixed form scope. The approved product decisions narrow those features; use the existing marketing_campaigns table for reviewed follow-up drafts without requiring a completed Marketing UI or Website Builder.
- The installed OpenSpec CLI is 1.3.1. Its status JSON omits newer planningHome/artifactPaths/requires fields; instructions.changeDir and outputPath resolve this change, and schema dependencies determine the four required artifact types.

## Goals / Non-Goals

**Goals:**
- Complete the approved owner and visitor webinar lifecycle, including series selection, actual Meet records, optional reviewed follow-ups, and feedback.
- Reuse auth and the mandatory hooks → API → services → server-only database boundary.
- Preserve tenant isolation, transactional registration limits, safe external effects, and honest incomplete-data states.
- Integrate shared contacts/consent so webinar deletion does not destroy business customer data.

**Non-Goals:**
- General AI-agent orchestration, a visual registration editor, the CRM pipeline UI, a Marketing campaign builder, checkout/subscription implementation, Google Calendar invites, or video hosting inside Nexus.
- Reminder campaigns, CSV export, waitlists, recurring schedule generators, attendee Nexus accounts, recordings, or transcripts.
- Rebuilding login, introducing multi-owner teams/business switching, or changing unrelated global UI.

## Decisions

### 1. Keep the owner module inside the protected dashboard boundary

Use Next.js App Router pages at /dashboard/webinars for the list, /dashboard/webinars/[sessionId] for session details, and /dashboard/webinars/series/[seriesId] for series management. Add only the real webinar destination to the dashboard tile. Use public /webinars/[slug], /webinar-series/[slug], and /webinar-feedback/[token] pages for visitors.

Create a webinar-scoped layout/provider and reuse any shared provider/shell already delivered by another teammate. Request-bound owner resolution stays inside Suspense; static shells do not query business tables. Hooks use stable query-key families and invalidate affected session/list/registration/attendance/follow-up/feedback data. Read the installed Next docs before implementing routing, cookies, or caching; the bundled docs were unavailable in this inspection environment.

Alternative considered: /webinars as both owner and public routes. Keeping owner pages under /dashboard reuses current protection and avoids widening the auth refactor. API routes still enforce authorization themselves; middleware alone is insufficient.

UI: use the list/detail/tab structure, with Overview, Registration, Attendance, Follow-up, and Analytics (feedback and actual session counts). Add a minimal responsive sidebar in the webinar layout if the shared shell is still absent; only navigable destinations appear. Reuse tokens, Manrope/Bricolage, Iconsax, existing buttons/cards/inputs, accessible dialogs, and motion under 300ms with reduced-motion support. Fixed form preview/settings replace the future visual registration editor. Do not display static “Synced”, fake delivery, or nonexistent purchase metrics.

### 2. Extend the actual schema through new migrations

Keep public.webinars as the session table and add nullable scheduled_start, presenter, timezone, nullable series_id, public_slug, capacity, registration_closes_at, followup_enabled (default false), product_url, version, and provider linkage. Preserve existing completed rows; the UI labels completed as Ended. A check constraint permits missing time only for drafts, enforces positive duration and positive capacity when present, and validates allowed lifecycle transitions in service/RPC operations. Store instants as timestamptz and the selected IANA timezone separately. Reject or explicitly resolve ambiguous/nonexistent local dates; changing timezone alone must not silently shift the instant.

Proposed related tables:
| Table | Purpose and identity |
| --- | --- |
| webinar_series | Business-owned series metadata and public slug; sessions remain individually scheduled |
| webinar_registrations | Session, business, normalized email, name, nullable shared contact_id, registration time; unique (session_id, normalized_email) |
| webinar_conferences | All relevant provider conference IDs for a session, actual start/end, import checkpoints |
| webinar_participants | Provider participant identity/type/display label; nullable registration mapping and explicit review disposition |
| webinar_participant_sessions | Stable provider join-session identity with join/leave timestamps; re-entry is not a new participant |
| webinar_imports | Current import/run status, paging checkpoints, errors, completion and review versions |
| webinar_followups | Session-owned review/delivery metadata referencing attendee/no-show marketing_campaigns drafts; immutable approved revision, audience snapshot/hash, schedule, gate version |
| webinar_feedback | One response per registration/session, hashed access token, rating/usefulness/comment/product interest |
| business_marketing_consents | Independent business/contact consent evidence; source, timestamp, and explicit affirmative choice |
Do not add another OAuth flow, callback, Google identity model, or connection UI. Extend the existing Supabase Google sign-in request with `meetings.space.created`. Supabase returns Google provider tokens but does not refresh them, so this feature adds one business-scoped server-only token-vault table. Store the token bundle encrypted with AES-256-GCM using a server secret; RLS is enabled and only the service role can read it. A server-only service refreshes expired access tokens using the same Google OAuth client credentials configured in Supabase Auth. The login callback associates tokens with the business derived from the authenticated user. Browser APIs expose only connection status, never credentials.
| webinar_work_items | Durable bounded work for Meet provisioning/import and per-recipient email outbox records, leases, retry state, stable effect key and provider ID |

Use business_id on all private records, composite business/entity foreign keys to prevent cross-business relationships, owner RLS on every table, indexes on business_id and lookup/due-work fields, and cascades only for webinar-owned children. Session → contact references point toward the shared contact; deleting a session never cascades into contacts or consent. No general-purpose event bus or ORM is needed.

The CRM seam is business + normalized email. Reuse the CRM service/RPC if present at implementation; otherwise provide a minimal webinar registration contact resolver against the existing fields, preserving customer status and supplied customer data. Coordinate a unique normalized email contract with the CRM owner. Migration must detect existing duplicates and stop with a remediation report rather than silently merging customers or imposing the planned stage schema.

### 3. Use narrow SQL transactions for registration and critical mutations

Owner APIs derive business_id from auth.getUser() and businesses.owner_id, then pass verified context to services. Every entity lookup includes that business. Return the repository's { data } or { error } JSON contract and safe semantic errors.

Public routes cannot derive a business from a logged-in owner because visitors have no account. This is the explicitly authorized public-registration boundary: resolve the public slug and selected session membership on the server/database and grant only narrow registration/feedback operations. Do not use the admin client to broadly bypass ownership during anonymous browser requests.

Implement narrowly scoped SECURITY DEFINER RPCs for public event projection, atomic registration, and token-bound feedback. Fix search_path, qualify table references, revoke default EXECUTE, allow only intended calls, validate every value and event state in SQL as well as Zod, and return only whitelisted public data. Anon has no general table SELECT/UPDATE permission. Because RPCs can be called directly, their scope, capacity, duplicate, and abuse checks must not rely on the API layer alone. UI still calls Nexus JSON endpoints, never Supabase directly. Apply persisted per-event/email abuse controls and route-level ingress throttling.

Lock selected session rows in stable ID order. Resolve duplicate registrations first, check capacity and deadline against current committed state, then insert reservations and confirmation outbox records in one transaction. A series selection is all-or-nothing: if a selected session is unavailable, return which selection must be corrected without creating new partial reservations. Normalize emails consistently without provider-specific rewriting. An unchecked marketing choice neither grants nor revokes independent consent.

Use optimistic versions for reschedule/cancel review previews. Commit only the reviewed session version and affected-recipient snapshot; if registrations changed, request another review. Draft/public/unavailable pages expose no attendee list, owner credentials, or Meet token.

Alternative considered: multiple Supabase HTTP writes followed by best-effort rollback. RPC transactions earn their complexity by preventing oversubscription, orphaned registrations, and notifications that disagree with committed schedules.

### 4. Separate local scheduling from Google Meet side effects

Persist a stable provisioning operation for each session. The server-only Meet adapter uses the connected owner's OAuth grant and the narrow `meetings.space.created` scope for app-created spaces. Reuse the existing Supabase Google sign-in and callback; do not create another OAuth route, callback, OAuth-state store, or Google connection UI. The encrypted token vault is business-scoped and server-only. `WEBINAR_GOOGLE_TOKEN_ENCRYPTION_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, and `GOOGLE_OAUTH_CLIENT_SECRET` must be configured with the AES key and the same Google OAuth credentials used by Supabase Auth. If Meet needs an additional scope, extend the existing consent request.

After a successful spaces.create response, persist the provider space name/meeting URI before completing scheduling. A reschedule reuses that session's existing space. Each other session gets its own space. Google Meet creation does not create a calendar event or guarantee the call starts at the planned time; schedule and email details live in Nexus.

The documented spaces.create request has no documented idempotency parameter. A database effect key prevents duplicate local requests but cannot guarantee exactly-once creation after an ambiguous transport failure. Do not blindly retry unknown creates. Persist an UNKNOWN outcome, attempt provider reconciliation where a reliable identifier exists, otherwise expose a recoverable operator task to verify/select the already-created space or deliberately create a replacement. A session with unresolved provisioning cannot accept registrations or claim scheduled success.

Alternative considered: a pasted Meet link. The user selected automatic per-session provisioning, so this alternative is not the normal scheduling flow.

References: [Create Meet space](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/create), [Meet authorization](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).

### 5. Import exhaustive records without overstating identity

Run bounded imports through durable work, after the scheduled start and as conferences become available. Discover all relevant conferences for the session's dedicated space; exclude practice calls before its scheduled window. Continue paging conference records, participants, and participant sessions across worker invocations. Upsert stable provider IDs with checkpoints and preserve prior manual identity mappings. Aggregate actual durations from the union of join intervals so overlapping devices do not double count; any entry qualifies as attendance.

Separate statuses: session draft/scheduled/live/completed/cancelled; import pending/running/incomplete/complete/failed; review unresolved/resolved. Scheduled end is not evidence of actual conference end. While a relevant conference is active or records/pages are unavailable, no-shows stay unfinalized. Requery completed conferences until a full successful import, and retain last-sync timestamps and paging-complete evidence.

Google participant data includes signed-in IDs, anonymous labels, and phone labels, not a universal verified registrant email. Match automatically only using a verified previously associated provider identity or other reliable evidence. Never treat display-name equality or clicking a join link as proof of attendance. Owner review can link to a registration or classify as host/unregistered. Keep these records visible with separate participant and registered-attendee counts. Such classification resolves review without inventing an email. An owner correction updates eligibility versions and invalidates pending stale approvals.

If Meet data is never accessible, show an import/reconnect problem and block absence-dependent follow-ups; do not mark everybody absent. Store imported attendance promptly since provider conference records expire after 30 days. Local data persists until webinar deletion.

References: [Participants](https://developers.google.com/workspace/meet/api/guides/participants), [Participant sessions](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.participants.participantSessions), [Conference records](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords).

### 6. Share one durable outbox for notifications and optional follow-ups

Use Resend's HTTP API through built-in fetch; no email SDK is needed for a small send seam. Configure a verified Nexus sender with the business display name and owner's reply-to. Use one work/delivery table for confirmations, approved schedule/cancel notifications, and optional follow-ups. Distinguish notification type from follow-up type rather than using the follow-up flag as an email master switch.

Registration queues a confirmation transactionally. Reschedule/cancel previews show changes and recipient counts before approval; committing queues the notifications. Follow-up is disabled by default. If selected, the owner can edit separate attendee/no-show drafts backed by existing marketing_campaigns rows and reviewed within the webinar UI. Add only a nullable webinar ownership relation to those rows so session deletion removes webinar-owned drafts without touching other campaigns. Webinar follow-up metadata references those drafts; immutable reviewed content snapshots feed the outbox. This preserves DESIGN.md campaign review semantics without implementing the broader Marketing module. After actual session end, full import, and review resolution, the owner approves exact content, audience snapshot, and delivery time. Feedback links personalize attendee messages; no-show messages do not assume attendance. Changing approved content, recipients, schedule, or eligibility requires a new approval revision.

Use immutable payloads and stable per-recipient effect keys such as registration-confirmation/{registration}, event-update/{session}/{version}/{registration}, and followup/{session}/{approved-revision}/{registration}. Workers recheck current session existence/state, enabled setting, approval revision, and eligibility before a follow-up send. Disable/cancel/delete cancels pending follow-ups. A send already accepted by a provider cannot be undone.

Use transactional leases and FOR UPDATE SKIP LOCKED to prevent concurrent claims. Record attempts and provider message IDs durably. Resend's idempotency keys last 24 hours: unknown sends must be reconciled within that window or held for manual recovery; do not retry an uncertain send after the window with a new key. Rejections known not to have accepted a request can retry with bounded backoff. Approval payloads remain immutable for all retries. Provider-accepted is not Delivered; a verified provider webhook can update delivered/bounced statuses. Owner views show partial failures and blocked reasons.

Implement POST /api/internal/webinar-work as a machine-authenticated, bounded Next.js Route Handler for future automation. For the hackathon, add an authenticated owner dashboard action that processes only the signed-in owner's business-scoped email jobs through a dedicated claim RPC. Keep the internal worker secret server-only. No Supabase Cron, Supabase Edge Function, or non-Next application worker is required for the demo. Both paths claim a bounded batch, use leases, preserve durable work if invocation fails, and report provider acceptance separately from inbox delivery.

Alternative considered: browser timers or an in-memory queue. They cannot deliver after the owner closes the page or survive restarts. A general queue framework is unnecessary at current scale.

References: [Resend idempotency](https://resend.com/changelog/idempotency-keys).

### 7. Feedback is scoped to a participant/session; consent is shared

Generate a cryptographically random feedback token, store only its hash, and include the raw token only in that participant's email link. The public feedback endpoint verifies token/session availability, validates a 1–5 rating, usefulness, optional bounded comment, product interest, and separate unchecked marketing choice. One response per registration/session is updated on resubmission. It has no cross-participant query access. Product interest is a lead signal, not proof of purchase or marketing permission.

Validate product destinations as HTTPS URLs and render them as external links rather than fetching arbitrary destinations from the server. Feedback/outcomes show response denominators and actual values. Affirmative consent is persisted independently of feedback; omission of a checkbox is not a withdrawal of prior consent. Use the same shared consent seam as registration.

### 8. Deletion is a transaction with worker fencing

Owner confirmation names session/series, counts webinar-specific records, and warns that deletion is permanent while emails already sent remain external. A series operation locks all owned session rows before cascade deletion. Delete webinar-owned records, feedback access tokens, drafts, imports, and outbox entries; preserve shared contacts, consent, and the business's Google connection and credentials.

Pending worker leases are invalidated. If a lease is executing or has an unresolved external effect, deletion returns a retryable conflict until it is safely resolved; this avoids reporting successful deletion while the same work can still send. Do not hold an unbounded database transaction across a provider request. Workers revalidate their lease immediately before dispatch and never recreate a deleted parent. Cancelled sessions retain all records and cancellation deliveries; they are displayed read-only except for explicit deletion.

Deleting a Nexus session does not claim to revoke provider-side Meet history or invalidate a Meet URL already delivered. If external space shutdown is later added, it must be a separately visible provider operation.

## Risks / Trade-offs

- [Anonymous identity cannot be matched automatically] → Preserve all returned records and require owner classification before no-shows/follow-ups; explain that a Google label may not contain an email.
- [A review queue can delay optional follow-ups] → Show a clear blocking reason and let owners resolve host/unregistered entries without inventing mappings.
- [Provider data availability/retention] → Persist successful pages promptly, retry within retention, and show unavailable/incomplete rather than fabricated counts.
- [Unknown Meet create/email outcome] → Persist effect keys/outcomes, reconcile, and block unsafe retry; do not promise impossible exactly-once external guarantees.
- [Concurrent deletion and sending] → Fence leases and reject deletion while an irreversible external effect is unresolved.
- [Anonymous registration RPC exposure] → Narrow operations, fixed search_path, SQL validation, scoped public projection, database abuse limits, and ingress throttling.
- [CRM teammate changes contact schema] → Reuse their seam when available; do not introduce duplicate lifecycle enums; check migration prerequisites and coordinate normalized-email uniqueness.
- [No Google API token persistence existed in the workspace] → Extend the existing login scope and callback, encrypt the provider token bundle server-side, and refresh it with the same Google OAuth client credentials; never create a parallel OAuth flow.
- [Email sender setup missing] → Explicit setup tasks and visible unconfigured states; no fake success in the demo.
- [Manual trigger only] → The owner explicitly processes a bounded batch; queued messages remain durable until triggered, and automatic delivery is deferred.
- [Multiple team members edit shared layout/schema] → Keep webinar routes/services isolated and make only small dashboard/provider integration edits.

## Migration Plan

1. Verify current shared contact/provider seams and read the locally installed Next guides; dependencies need installation before implementation checks in this environment.
2. Add a new versioned migration for draft-compatible sessions, series, related tables, RLS/grants, uniqueness/check constraints, transaction RPCs, and durable work. Audit existing contact duplicates before any new unique constraint. Preserve existing scheduled/completed webinar data and timezone defaults explicitly.
3. Generate Supabase TypeScript definitions. Add services, owner/public contracts, and a business-scoped manual worker trigger; validate migrations in a disposable database.
4. Extend the existing Supabase Google sign-in and callback with the Meet scope and encrypted token vault. Configure its encryption key and the same Google OAuth client credentials, plus the Resend verified sender/API key, public app URL, and machine worker authentication as server-only Next.js setup.
5. Deploy routes and apply migrations before using the owner manual trigger. Run a real test-owner session and controlled mail recipients to prove scheduling, attendance import, review, and feedback.
6. Rollback by disabling manual claims first, then reverting application deployment while retaining additive data. Do not drop new data-bearing tables as a routine rollback. Before reverting code that requires scheduled_start NOT NULL, export/resolve any new drafts; the database migration is not blindly reversible.

## Open Questions

No further product-scope decisions are required for this proposal. The following environment facts must be resolved during the specifically named setup/verification tasks before claiming an operational integration:
- Which deployment URL/runtime limits and Supabase project are assigned to the demo?
- Is the Google OAuth consent configuration authorized for the selected Meet scope, and do the real test calls expose the expected conference records?
- Which verified sender domain/owner reply-to and Resend credentials will be supplied?
- Has the CRM teammate delivered a normalized-email contact/consent seam or migrations since this inspection?

These are operational prerequisites, not permission to substitute mock integration behavior for the approved lifecycle.
