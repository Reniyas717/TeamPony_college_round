## ADDED Requirements

### Requirement: Central action coverage across existing operations
Every existing business or security change in scope SHALL record an event through the central AuditService contract and shared internal database audit insertion routine. Coverage SHALL include authentication/business provisioning, Google connection or credential replacement, CRM contact/note/stage changes, website lifecycle changes, webinar and series lifecycle changes, public registration and consent, attendance import/review, feedback, follow-up review/scheduling, notification delivery, journey-map saved changes, workflow definition/run/step/approval changes, and actual rejected authorization attempts. Pageviews, ordinary reads, UI filter changes, and diagnostic noise SHALL NOT be audit events. Static examples and proposals SHALL NOT generate fabricated executed-action events.

#### Scenario: Existing operation is completed
- **WHEN** an owner changes a real business resource in any covered feature
- **THEN** the central trail contains the action, verified business, affected resource, actual executor, and accurate result

#### Scenario: Batch attendance import
- **WHEN** an owner triggers an attendance import batch
- **THEN** the system records the operation and its resulting state/counts without adding a separate security audit event for every fetched provider row

#### Scenario: Static demonstration content
- **WHEN** an owner views hard-coded billing, marketing, agent, or approval examples
- **THEN** the system does not record those examples as executed business operations

### Requirement: Trusted executor and authority attribution
Audit events SHALL distinguish the executor from the initiator and approver. A human change SHALL identify the verified user; an AI operation SHALL identify the AI executor and initiating owner; approval SHALL identify the verified approving owner; worker and provider actions SHALL use their actual system/integration attribution. Unverified public registrants SHALL NOT be represented as authenticated business owners. Clients SHALL NOT choose authoritative actor IDs, business IDs, outcomes, or approval fields.

#### Scenario: AI changes a CRM record after owner approval
- **WHEN** an AI workflow performs an approved CRM change
- **THEN** the event identifies the AI executor, the initiating owner, and the verified approver rather than representing the mutation as a direct human action

#### Scenario: Registration by an anonymous visitor
- **WHEN** a visitor registers through a valid public form
- **THEN** the audit event identifies the trusted public-registration execution path and resolved registration resource without inventing an authenticated owner identity for the visitor

#### Scenario: Owner rejects a workflow
- **WHEN** the verified owner rejects their paused workflow run
- **THEN** the rejection event records that owner and run, and no approved-execution event is fabricated

### Requirement: Platform security events without a fictitious business
The central audit contract SHALL permit a null business reference only for an explicitly allowed platform security action with trusted server authority. Business operations SHALL require a verified non-null business reference. New anonymous authentication failures SHALL NOT be assigned to SYSTEM_BUSINESS_ID. Platform events SHALL be excluded from ordinary owner audit queries and SHALL NOT require a second audit table or administrator UI. Existing historical rows SHALL remain unchanged.

#### Scenario: Anonymous failed login
- **WHEN** authentication fails before any business identity is verified
- **THEN** the trusted authentication path records an allowed platform event without assigning it to a guessed business or verified-human actor

#### Scenario: Business event has no business
- **WHEN** an event describing a contact, website, webinar, journey, or workflow mutation lacks verified business context
- **THEN** validation and database enforcement reject that business event

#### Scenario: Owner views their history
- **WHEN** an owner requests the existing audit viewer or API
- **THEN** the response contains only that owner's business events and excludes platform events and other businesses' events

### Requirement: Allowlisted audit metadata
AuditService SHALL validate per-action metadata against a closed allowed field set and apply the existing sanitizer before persistence. Allowed fields SHALL be limited to necessary resource references, counts, changed field names, selected safe status values, and correlation/provider references. Audit events SHALL NOT store credentials, raw prompts, unrestricted request/response bodies, message bodies, free-text feedback, or unfiltered provider payloads. Database entry points SHALL prevent direct callers from bypassing the metadata restrictions.

#### Scenario: Payload contains unexpected sensitive fields
- **WHEN** an operation proposes metadata containing a token, email body, raw prompt, or other unapproved field
- **THEN** the system rejects or removes that field before persistence and stores only the action's allowed metadata

#### Scenario: Provider payload has useful identifiers
- **WHEN** a delivery operation receives a provider response with an ID and unrelated payload fields
- **THEN** the audit event stores only the allowed provider reference and outcome rather than the complete response

### Requirement: Audit history is authoritative and immutable
Authenticated browser clients SHALL NOT directly forge audit entries, executor identities, or outcomes through table inserts or unrestricted audit RPCs. Audited mutation RPCs SHALL derive or validate authoritative context themselves. The system SHALL retain the existing append-only database protection, provide no normal update/delete path for historical events, and return a real persisted result rather than a synthetic successful audit record.

#### Scenario: Forged direct audit insertion
- **WHEN** a browser caller tries to insert an event under another actor or call an unrestricted audit insertion function
- **THEN** database privileges and checked function logic deny that forged write

#### Scenario: Historical event deletion
- **WHEN** an ordinary application operation attempts to update or delete an audit row
- **THEN** the database prevents the change and preserves the original row

### Requirement: Required database mutation and audit commit together
A critical database business mutation and its required audit event SHALL commit in one transaction. A failed required audit write SHALL roll back the business mutation, propagate AuditLoggingError or an equivalent safe translated error, and prevent a success response. Independent JavaScript calls that mutate first and log second SHALL NOT be presented as atomic. Rejected authorization SHALL remain rejected even when a failure event cannot be persisted.

#### Scenario: Audit insertion fails during a contact change
- **WHEN** the contact update succeeds within a transaction but its required audit insertion fails
- **THEN** the transaction rolls back the contact change and the API does not report successful completion

#### Scenario: Audited public registration
- **WHEN** a valid public registration is committed
- **THEN** registration, its required related CRM/consent changes, and their required audit events are committed consistently within the existing checked registration transaction

#### Scenario: Denial logging is unavailable
- **WHEN** a cross-business request is denied and the audit database is unavailable
- **THEN** access remains denied, no data is changed or disclosed, and the system does not claim a failure event was persisted

### Requirement: Honest external operation intent and outcomes
Before invoking a consequential external operation, the system SHALL persist the authorized intent with its operation reference and required audit record. It SHALL record provider acceptance, confirmed failure, or uncertainty accurately and correlate the result with that intent. If the provider effect may have happened but local confirmation failed, the system SHALL return an owner-visible Needs review state and retain available references; it SHALL NOT claim external rollback or automatically repeat an unsafe operation. Existing provider idempotency guarantees SHALL be used for safe retry where available.

#### Scenario: Meet creation times out
- **WHEN** Meet space creation may have succeeded but the server cannot confirm the outcome
- **THEN** the operation remains marked for review and another unprotected creation attempt is not made automatically

#### Scenario: Email accepted but finalization fails
- **WHEN** the email provider accepts a message and local result persistence fails
- **THEN** the operation is reported as uncertain or needing review, with its persisted intent/reference retained, rather than as rolled back or safely resent

#### Scenario: Manual worker processes approved jobs
- **WHEN** the owner manually processes eligible queued webinar messages
- **THEN** the system preserves the current approval/eligibility checks and records accurate per-message outcomes without adding a scheduled worker
