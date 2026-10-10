# Webinar management

Status: product decisions confirmed; implementation is in progress. This document specifies intended behavior and does not claim the feature is complete.

## Scope

A logged-in business owner manages standalone webinar sessions and webinar series, registrations, Google Meet attendance, optional event follow-ups, and feedback in Nexus. Each owner operates their own business; public registrants do not need a Nexus account.

## Accepted decisions

### Sessions and series

- The owner can create, edit, schedule, cancel, and delete webinars.
- Session setup includes title, description, presenter, date, start time, timezone, and duration.
- Allow saving unscheduled drafts. Each session in a series has its own title and schedule.
- A standalone session has its own Nexus registration form.
- A series has one Nexus registration form where people choose one or more sessions. Registrations and attendance are tracked per selected session.
- Cancelling retains the event and its associated records.
- Deleting a session permanently removes its webinar-specific registrations, attendance, feedback, and follow-up records and stops pending follow-up emails.
- Deleting a series also deletes all its sessions and their webinar-specific records.
- Shared CRM contacts and separate marketing opt-ins are retained. Deletion cannot retract emails already sent.

### Registration

- Use a fixed Nexus form with name and email; series forms also offer session selection.
- Public registration does not require a Nexus account.
- Prevent duplicate registration for the same email and session.
- The owner can set an optional registration capacity and deadline for each session.
- By default, registration closes at the session start. Full or closed sessions stop accepting registrations.
- Future marketing consent is a distinct optional, unchecked choice. Registration or an event follow-up does not imply that consent.

### Event notifications

- Send registration confirmation emails containing the session's Meet link.
- Notify registered participants when the owner reschedules or cancels their session.
- These event notifications operate independently of the optional follow-up service, using the same email delivery infrastructure.
- Show affected recipients before the owner confirms a reschedule or cancellation.

### Google Meet and attendance

- Webinar management uses the existing Supabase Google sign-in as its only OAuth flow. The login requests the meetings.space.created scope with offline access, and the existing callback stores the returned Google token bundle encrypted in a business-scoped server-only vault. Nexus refreshes expired Google tokens using the same client credentials configured in Supabase Auth. No separate login or callback is introduced.
- Nexus creates a separate Google Meet link when the owner schedules each session.
- Import and persist participant and join/leave session records exposed by Google Meet, including unregistered, anonymous, and phone participants.
- A person who entered counts as attended regardless of how briefly they stayed.
- Preserve all imported participant records; do not discard a participant because no registration matches.
- Automatically match identities only when reliable. The owner reviews uncertain matches.
- Treat incomplete or failed attendance imports as unresolved, not as evidence that registrants were absent.
- Attendance completeness is bounded by the data exposed by the authorized Google Meet API; importing a record does not guarantee a participant has an identifiable email.

### Optional follow-up service

- Follow-up emails are sent only if the owner selects the follow-up service.
- Follow-ups are associated with individual sessions and can only be sent after that session ends.
- Attendees and no-shows receive different messages.
- Hold follow-ups until attendance import and uncertain matches are resolved.
- The owner reviews the message and recipient list, then schedules delivery.
- Use a configured Nexus sender displaying the business name, with replies directed to the owner.
- Event follow-up is a one-time communication; future marketing requires its own opt-in.

### Feedback

- An attendee email links to a Nexus feedback page.
- Collect a rating, whether the session was useful, optional comments, and product/subscription interest.
- Future marketing consent is a separate unchecked choice.
- No-shows receive a different message without questions that assume attendance.
- Record product interest for the owner and allow an optional owner-provided product or purchase URL.

## Acceptance scenarios

1. An authenticated owner creates an unscheduled session draft, then schedules it with the configured timezone and an automatically created Meet link.
2. A visitor registers without a Nexus account, receives confirmation with the Meet link, and cannot duplicate a registration for the same email and session.
3. A visitor uses a series form to choose sessions; each selection has its own registration and attendance outcome.
4. A session rejects new registrations after its deadline or when capacity is reached.
5. The owner sees affected recipients before confirming a reschedule or cancellation. Cancellation retains records and sends the event notification even when follow-ups are disabled.
6. The owner deletes a session or series and its webinar-specific records; pending follow-ups stop while shared CRM contacts and marketing consent survive.
7. Attendance imports retain every participant and join session returned by Meet, preserve unmatched participants, and show incomplete imports honestly.
8. When follow-ups are disabled, no follow-up emails are sent. When selected, they wait for the session to end and attendance to be resolved, then require owner review and scheduling.
9. Attendees and no-shows receive different follow-ups. Attendee feedback records usefulness, rating, comments, and product interest with separate optional marketing consent.
10. An owner cannot read or change another business's webinars or related private records.

## Integration prerequisites

Implementation extends the existing Supabase Google sign-in and callback with Meet and Gmail send scopes and an encrypted server-side provider-token vault with refresh. Configure the vault key and the same Google OAuth client credentials used by Supabase Auth. Webinar emails are sent through the business owner's verified Google account. The hackathon demo uses an owner-triggered manual batch for scheduled messages; registration confirmations are attempted immediately. Automatic scheduling is deferred. External Google setup and the live email lifecycle still require verification.

### Delivery configuration contract

The server-only webinar delivery slice uses these deployment values:

- `WEBINAR_WORKER_SECRET`: required as `Authorization: Bearer <secret>` for `POST /api/internal/webinar-work`.
- `NEXT_PUBLIC_APP_URL`: the public Nexus origin used by future message producers for links.
- `WEBINAR_GOOGLE_TOKEN_ENCRYPTION_KEY`: 32-byte key as 64 hex characters or base64 for AES-256-GCM token encryption.
- `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`: the same Google OAuth client values configured for Supabase Auth; used only by the server-side provider-token refresh.

The existing Google login requests `https://www.googleapis.com/auth/meetings.space.created` and `https://www.googleapis.com/auth/gmail.send`. The Gmail permission is sensitive and allows Nexus to send messages on the owner's behalf; Nexus does not read the mailbox. The PKCE callback checks Google's token grant and verified account address, then encrypts provider tokens, the Google subject, and sender address in the business-scoped vault. Supabase does not refresh Google tokens on the application's behalf; Nexus uses the configured OAuth client values to refresh them server-side. Never expose the vault key, client secret, or provider tokens in browser code. Enable Gmail API and add the Gmail scope to the Google OAuth consent configuration. Each owner must reconnect Google and approve the permission. For the hackathon, keep the app in Testing and add demo owners as test users.

The worker accepts at most 50 jobs per invocation, leases jobs for five minutes, retries confirmed transient failures with database-controlled backoff, and keeps provider outcomes that cannot be confirmed in `unknown` without an automatic resend. Gmail acceptance is the highest delivery state currently represented; it is not inbox delivery. Gmail does not provide an idempotency key for its send endpoint. Old Resend outbox rows retain their original sender and will fail the sender match check; they must be recreated as new email jobs after Gmail is connected.

### Manual worker trigger

Cron is deferred for the hackathon. From the webinar dashboard, the signed-in owner can select **Process queued emails** to process one bounded batch of up to 50 due messages for their own business. The server derives the business from the verified session; the browser never receives the worker secret. Apply `20261019_webinar_manual_worker.sql` to enable business-scoped claims. Run the action again if more than 50 jobs are queued. The result reports Gmail acceptance, retryable failures, reconnect requirements, permanent failures, and unknown outcomes. Acceptance does not guarantee inbox delivery. Automatic delivery requires a future scheduler or always-on worker.

## Repository observations

At inspection, Supabase authentication, login/signup routes, a protected dashboard, and an initial SQL migration are present. The migration contains a basic webinars table but does not yet model series, registrations, Meet identities, attendance sessions, follow-up delivery, or feedback. Runtime behavior and external integration setup have not been verified during this requirements interview.

Implementation must follow AGENTS.md and DESIGN.md, with owner-scoped API routes, services, server-only database access, and versioned migrations.

## Implementation status (2026-10-10)

The Next.js owner dashboard, session and series foundations, native registration flow, event email outbox, Google Meet OAuth token vault, attendance import/review, public feedback form, and optional follow-up draft/scheduling path have implementation code and versioned migrations. Public registration requests are throttled by normalized email and, when available, client IP. Rescheduling previews the old/new times and recipient count, verifies an exact registration snapshot and version at commit, reuses the existing Meet link, queues independent notifications, and invalidates prior follow-up approval. The owner Analytics tab shows feedback responses and outcome counts. Follow-up scheduling captures a reviewed recipient snapshot and rechecks approval and attendance eligibility immediately before dispatch. Individual and series deletion now have reviewed count previews and transactional owner-scoped deletion with guards for unresolved Meet or email effects; shared CRM contacts and separate marketing consent survive. The owner dashboard includes a manual, business-scoped email worker trigger; automatic scheduling is deferred for the hackathon. Remaining OpenSpec work includes atomic registration/notification and reschedule/cancellation guarantees, service/API/database tests, migration/database verification, and real Google Meet/provider validation. No deployment migration or controlled external-service lifecycle has been verified in this workspace, so the feature is not considered complete.

The internal worker endpoint still requires `WEBINAR_WORKER_SECRET`; the dashboard trigger instead uses the signed-in owner's session and a verified business-scoped claim. No Cron job is configured or required for the hackathon demo.

## Local verification (2026-10-10)

- `npm run lint`: passed.
- `npm test`: passed (36 tests, including the webinar timezone tests).
- `npx tsc --noEmit`: passed.
- `npm run build`: blocked because Next.js could not fetch the existing Manrope and Bricolage Grotesque Google Fonts in this network environment. The imports remain in `app/layout.tsx` as the project's single runtime font source.
- Database migrations and external-provider lifecycle remain unverified: the local Docker daemon is unavailable, the `.env` only has Supabase URL/key entries, and no controlled Google Meet account run was performed.
