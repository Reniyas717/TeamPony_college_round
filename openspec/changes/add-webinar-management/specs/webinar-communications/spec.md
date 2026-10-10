## ADDED Requirements

### Requirement: Independent event notifications
The system SHALL queue registration confirmations and approved reschedule/cancellation notifications using the same email infrastructure as follow-ups. Event notifications SHALL operate regardless of whether the owner enables the optional follow-up service. Messages SHALL use the business display name, a configured Nexus sender, and the owner's reply-to address.

#### Scenario: Cancel a session with follow-ups disabled
- **WHEN** the owner reviews affected registrants and confirms cancellation
- **THEN** cancellation emails are queued even though no follow-up service is enabled

### Requirement: Explicitly optional follow-up service
The follow-up service SHALL be disabled until the owner selects it. Disabling it SHALL stop pending follow-up deliveries while leaving event notifications operational. Cancelled or deleted sessions SHALL NOT initiate new follow-ups.

#### Scenario: Owner does not select follow-ups
- **WHEN** a session finishes with follow-ups disabled
- **THEN** the system sends no attendee/no-show follow-up emails

#### Scenario: Owner disables previously selected follow-ups
- **WHEN** the owner disables the service before dispatch
- **THEN** pending follow-ups are cancelled and independent event notifications remain available

### Requirement: Attendance-aware drafts and owner review
The system SHALL prepare different attendee and no-show messages as reviewable drafts. Before scheduling delivery, the owner SHALL see the exact subject/body, audience, recipients/counts, sender, purpose, and scheduled time and explicitly approve the reviewed version. Unidentified participants without a reliable email SHALL NOT receive fabricated deliveries.

#### Scenario: Review attendee message
- **WHEN** the owner prepares an attendee follow-up
- **THEN** the draft requests session feedback, includes the participant's feedback link, and can invite product interest without granting future marketing consent

#### Scenario: Review no-show message
- **WHEN** the owner prepares a no-show follow-up
- **THEN** its wording does not assert attendance or ask questions that assume participation

#### Scenario: Changed approved content
- **WHEN** message content, classification, recipient set, or delivery time changes after approval
- **THEN** the changed delivery requires renewed owner review before dispatch

### Requirement: Post-session dispatch gates
Follow-ups SHALL dispatch only after their scheduled delivery time, confirmed session end, successful attendance import, resolved uncertain matches, active follow-up selection, and valid owner approval. The worker SHALL check these conditions again at dispatch.

#### Scenario: Premature delivery
- **WHEN** a worker encounters a due follow-up before session end or with incomplete attendance
- **THEN** it does not send the message and exposes the blocking condition

#### Scenario: Owner schedules approved follow-ups
- **WHEN** all gates are satisfied and the approved delivery time arrives
- **THEN** the worker sends each approved recipient the correct message without requiring the owner's browser to remain open

### Requirement: Durable delivery and retry safety
Messages SHALL have persisted delivery records, immutable payload identity, and unique idempotency keys. Concurrent workers and retries SHALL NOT intentionally repeat an external send. Unknown outcomes SHALL require reconciliation before the provider's deduplication window expires or manual recovery rather than an unsafe new send.

#### Scenario: Worker retries an accepted send
- **WHEN** the provider accepted a message but the worker did not persist the response
- **THEN** recovery uses the same payload and idempotency key or reconciles provider status rather than creating another logical delivery

#### Scenario: Two workers claim one delivery
- **WHEN** workers run concurrently
- **THEN** only one valid claim can execute that delivery at a time

#### Scenario: Outcome remains unknown beyond deduplication retention
- **WHEN** the provider's retry safety window has elapsed and acceptance is still unknown
- **THEN** the system holds the delivery for reconciliation instead of blindly retrying it

### Requirement: Honest notification and follow-up outcomes
The owner SHALL see queued, processing, provider-accepted, delivered where verified, failed, blocked, and cancelled outcomes with safe error messages. The system SHALL NOT equate provider acceptance with proven inbox delivery or report a whole recipient group successful if some recipients failed.

#### Scenario: Partial audience failure
- **WHEN** some messages are accepted and others fail
- **THEN** the view reports counts and recipient outcomes separately and retries only eligible failed/unknown work
