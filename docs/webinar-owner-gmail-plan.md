# Owner Gmail delivery for webinar emails

Status: implementation plan; application code is being implemented from this plan. Google Console setup and live email verification remain external steps.

## Outcome

Send webinar emails from the business owner's connected Google mailbox using Gmail API. Reuse the existing Supabase Google OAuth flow, encrypted business token vault, refresh logic, and webinar email outbox. This change applies to webinar emails only.

The sender is the Google account connected to the business. It is not an arbitrary email entered in a profile. The account must have Gmail enabled, including a Gmail-enabled Google Workspace account.

## Current code and gaps

- Login, signup, and the webinar reconnect action already request offline Google access through Supabase. Their scope requests must stay consistent.
- The callback in project/app/auth/callback/route.ts stores provider tokens through project/services/webinar/google-token-vault.service.ts.
- The vault encrypts access and refresh tokens per business and refreshes with the same OAuth client configured in Supabase.
- The vault currently hardcodes meetings.space.created when saving tokens. It must persist actual provider-granted scopes, not requested scopes.
- project/services/webinar/email-provider.ts calls Resend. The worker currently records provider metadata as resend.
- Registration, reschedule/cancellation notifications, and follow-up producers obtain their sender from WEBINAR_EMAIL_FROM.
- Registration confirmations already attempt delivery immediately after enqueueing. Other emails use the owner-triggered manual worker.
- Email payloads are immutable once enqueued. Existing Resend jobs must not have their sender rewritten to a Gmail address.
- The audit RPC allows the system actor webinar.manual-worker for email worker events. Keep this established executor identity for both immediate and manual sends.

## Decisions for the hackathon

1. Use the same Supabase Google login/callback. Add gmail.send alongside the existing Meet scope and identity scopes; request offline access and consent when reconnecting.
2. All new webinar emails use the owner's connected Gmail account. Other features using Resend remain outside this change.
3. Request send-only Gmail permission. Reading inbox messages, managing drafts, aliases, and Gmail settings are outside scope.
4. Send registration confirmations immediately. Keep the manual dashboard trigger for due reschedule, cancellation, and scheduled follow-up messages. A scheduled email becomes eligible at its scheduled time and is sent when the owner triggers processing.
5. Preserve the registration if email delivery fails. Show the accurate email outcome and let the owner reconnect if permission is missing.
6. Keep follow-ups optional, with separate attendee/no-show messages, owner review and scheduling, and distinct future marketing opt-in.
7. Use existing outbox locks and effect keys to prevent duplicate local execution. Gmail's send endpoint exposes no documented idempotency-key parameter; do not claim exactly-once external delivery. A timeout, malformed success response, lost connection after submission, or ambiguous server error stays unknown and is not automatically resent.
8. No new queue service, Cron job, mail SDK, or second token store is needed.

## Implementation sequence

### 1. Extend existing OAuth requests

- Define shared Google scope constants used by login, signup, webinar reconnect, callback audit metadata, and the token vault.
- Include https://www.googleapis.com/auth/gmail.send and retain https://www.googleapis.com/auth/meetings.space.created.
- Retain existing PKCE callback handling and return-to-webinars navigation.
- Use the existing offline/consent settings so reconnecting owners can grant the new permission.
- Keep a successful Nexus sign-in successful if an optional Google module permission is declined. Report which feature needs reconnection.

Verify: OAuth requests include both capabilities; login and Meet creation continue to work; an existing token without Gmail permission cannot be mistaken for a Gmail-enabled connection.

### 2. Verify grants and sender identity in the existing vault

- Inspect actual Google token grants on callback using a server-side token inspection request. Never infer a granted permission from the requested scope list.
- Retrieve the connected account identity with Google's OpenID Connect userinfo endpoint using existing identity permissions. Require a verified email and match the Google subject to the owner's verified Google identity.
- Store Google subject and sender email inside the existing encrypted token bundle, alongside tokens, expiry, and actual grants. Do not put credentials in audit metadata.
- Keep compatibility with old encrypted bundles: Meet remains usable; Gmail requires reconnect when sender/grant fields are absent.
- Make token retrieval accept the capability required by its caller. Meet requires the Meet scope; sending mail requires Gmail send. Recheck required scope after refreshing.
- Reuse a prior refresh token only for the same verified Google subject; do not combine credentials from different Google accounts.
- Expose separate meet_connected, gmail_connected, reconnect_required, and connected sender email through the existing owner-scoped Google connection endpoint and hook. Treat expiry as refreshable rather than automatically disconnected.

Verify: actual grants are saved, a missing Gmail scope is reported clearly, refresh preserves account identity, one business cannot use another business's token, and existing Meet-only bundles remain supported.

### 3. Add Gmail sending at the provider boundary

- Implement sendGoogleEmail in project/services/webinar/email-provider.ts or an adjacent server-only Gmail provider file, with a small business-scoped interface.
- Resolve the encrypted token and verified sender for the job's business on the server. Check that the queued sender matches that connected Google account before dispatch.
- Build a MIME message containing To, From, Subject, and plain-text/HTML alternatives. Validate addresses, reject CR/LF header injection, encode Unicode subjects correctly, and use a stable Message-ID derived from the outbox effect identity. Message-ID is traceability, not a Gmail deduplication guarantee.
- Base64url-encode the complete MIME message and call POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send using native fetch and Buffer.
- Treat a response containing a valid Gmail message ID as provider acceptance; retain that ID in provider_id. Do not claim inbox delivery.
- Keep safe, actionable error categories: permission/reconnect, API disabled, unavailable Gmail mailbox, quota/rate limit, invalid message, and unknown result. Log allowlisted provider status/reason only, never tokens or raw message bodies.
- Missing/expired authorization discovered before sending is a confirmed unsent outcome. Retry only confirmed unsent/transient failures; do not auto-retry ambiguous submission outcomes.

Verify: correctly encoded mail, sender binding, failure classification, safe diagnostics, and no automatic duplicate submission after an uncertain result.

### 4. Switch webinar producers and the shared worker

- Registration-confirmation, event-notification, and follow-up services resolve the verified Google sender rather than WEBINAR_EMAIL_FROM.
- All new outbox rows retain existing tenant IDs, effect keys, recipient snapshots, approval checks, and scheduling semantics.
- The worker calls Gmail and records provider: gmail through the existing AuditService contract; keep webinar.manual-worker as actor type system.
- Maintain the immediate claim of just the new registration email; processing a registration must not dispatch unrelated pending messages.
- Preserve manual batch limits and business-scoped claims. Recheck follow-up approval and attendance eligibility immediately before send.
- Distinguish permanent failure from a retryable queued outcome in registration status. Current result.failed includes both and should not always become retry_queued.
- Reject legacy Resend sender rows with a clear terminal, unsent error rather than altering their immutable payload or silently sending from a different account. Preserve previously accepted and unknown historical outcomes. Use a fresh webinar/registration for the Gmail demo; old-job recreation can be added only if needed.

Verify: all five webinar email kinds use Gmail for new jobs; immediate confirmations send through the correct business account; unknown jobs are not retried; legacy sender jobs cannot be silently rewritten.

### 5. Update the webinar connection and delivery UI

- In the webinars page, show the connected sender address and whether Meet and Gmail permissions are present.
- When Gmail permission is missing, show Reconnect Google to enable webinar emails, using the existing login flow.
- Keep Meet capability and Gmail capability distinct. Missing Gmail permission does not prevent creating/editing a draft or using an already-authorized Meet connection.
- Registration success states distinguish saved registration, Gmail acceptance, pending delivery, confirmed failure, and unknown delivery.
- Keep Process queued emails for scheduled messages and existing loading feedback. Results should identify Gmail acceptance and safe reasons for failures.
- Preserve owner review and approval controls for recipient batches and follow-ups; Google OAuth consent is permission to use Gmail, not approval for every bulk workflow.

Verify: clear reconnect UX, truthful outcomes, existing dashboard layout/design, and an accepted email visible in the owner's Gmail Sent folder.

### 6. Update docs and validate the integration

- Update docs/webinar-management.md and relevant OpenSpec artifacts if this plan becomes an OpenSpec change.
- Document the new Gmail permission, owner sender identity, Google Console setup, manual scheduled delivery, and unknown-outcome handling.
- Remove webinar-only dependencies on RESEND_API_KEY and WEBINAR_EMAIL_FROM from the delivery contract. Do not delete environment values that other modules may use.
- No schema migration is expected for this approach: sender identity fits inside the encrypted token bundle and the existing outbox already stores sender and provider message ID. If implementation reveals a required RPC/schema change, author a versioned migration and report it explicitly before deployment.
- Run focused provider/token/worker checks, lint, build, and a controlled live lifecycle using the demo owner and a recipient other than the owner.

## Required Google Console actions

These require access to the Google Cloud project used by Supabase OAuth:

1. Enable Gmail API in that project.
2. Add gmail.send to the OAuth consent configuration.
3. Keep the app in Testing for the hackathon and include every demo owner as a test user. Recipient-only accounts do not sign in to Nexus and do not need to be OAuth test users.
4. Keep the existing Supabase callback URI and the existing Google OAuth client ID/secret.
5. Reconnect each demo owner through Nexus and approve the new permission. Existing Meet tokens do not acquire Gmail permission automatically.
6. Confirm the selected Google account has a usable Gmail mailbox and can send mail. Reconnect again if Google expires or revokes the testing authorization.

Gmail send is a sensitive scope. Testing is suitable for the controlled demo; public distribution would require reviewing Google's verification requirements. Workspace administrators may also restrict consent.

## Acceptance checklist

- [ ] An existing Meet connection still works after the vault changes.
- [ ] Reconnecting grants Gmail send and records the actual sender identity.
- [ ] A registrant other than the owner receives a confirmation from the owner's Google mailbox.
- [ ] The message appears in the owner's Sent folder and Nexus records the Gmail message ID.
- [ ] Each selected session in a webinar series produces its own confirmation without duplicate execution.
- [ ] Reschedule and cancellation notifications send from the owner with the manual trigger.
- [ ] Due attendee/no-show follow-ups send only after owner approval; future marketing consent remains separate.
- [ ] Missing permission, revoked refresh token, disabled API, invalid sender, and quota errors produce safe explanations.
- [ ] A timeout or ambiguous provider outcome is marked unknown and is not automatically resent.
- [ ] Another business cannot inspect or use the owner's Google token or send their pending emails.
- [ ] Old Resend sender rows are handled explicitly without changing their immutable payload.
- [ ] Lint, build, and focused regression checks pass, with live setup and verification results documented honestly.

## References

- [Gmail scope definitions and sensitivity](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Creating and sending MIME messages](https://developers.google.com/workspace/gmail/api/guides/sending)
- [Gmail users.messages.send](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)
- [Google server OAuth and offline access](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OpenID Connect identity and userinfo](https://developers.google.com/identity/openid-connect/openid-connect)
