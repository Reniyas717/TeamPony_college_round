## ADDED Requirements

### Requirement: Reuse the existing per-owner Google OAuth integration
The system SHALL use the existing Supabase Google sign-in and PKCE callback as the only OAuth flow. The login SHALL request the least-privilege meetings.space.created scope and offline access. Because Supabase does not refresh Google provider tokens, the callback SHALL store the provider token bundle in an AES-256-GCM encrypted, business-scoped server-only vault and a server service SHALL refresh access tokens with the same Google OAuth client credentials configured in Supabase Auth. The system SHALL NOT add another OAuth flow, callback, or Google connection UI. The Next.js Meet adapter SHALL scope access to the business derived from the verified owner session. APIs and UI SHALL expose only safe connection status, never provider tokens.

#### Scenario: Existing Google connection supports Meet
- **WHEN** an authenticated owner has connected Google through the existing integration and the required Meet scope is granted
- **THEN** the Next.js Meet adapter uses that connection for only the owner's business

#### Scenario: Existing integration cannot provide Meet access
- **WHEN** the existing Google integration is disconnected, expired, or lacks the required Meet authorization
- **THEN** the webinar UI shows the safe reconnect/authorization state and does not report Meet provisioning or import success

#### Scenario: Owner identity does not match integration
- **WHEN** the existing Google integration is not bound to the authenticated owner's business
- **THEN** the Next.js service rejects use of that connection without exposing its credentials or another business's Meet data

### Requirement: Separate Meet provisioning per session
Scheduling SHALL provision a separate Google Meet space for each session under its connected owner. Repeated local scheduling requests SHALL reuse a persisted result. The system SHALL retain an uncertain external outcome and reconcile or require recovery rather than blindly repeating a possibly successful create request.

#### Scenario: Schedule multiple sessions
- **WHEN** the owner schedules two sessions in a series
- **THEN** each session receives a distinct persisted Meet space and meeting URI

#### Scenario: Provisioning outcome is unknown
- **WHEN** a Meet creation request times out after possibly reaching Google
- **THEN** the session remains visibly unresolved and the system does not automatically create duplicate spaces or announce successful scheduling

### Requirement: Exhaustive provider attendance import
The system SHALL import and persist all participant records and join/leave sessions exposed for the webinar's relevant Meet conferences, traversing every page of conference, participant, and participant-session results. It SHALL retain signed-in, anonymous, phone, and unregistered participants. Local records SHALL remain available after provider retention expires, unless the owner deletes the webinar.

#### Scenario: Multiple pages and re-entry
- **WHEN** Meet returns paginated participants and several join sessions for one participant
- **THEN** the import retains every returned participant and join session without conflating separate participants or counting a re-entry as a new person

#### Scenario: Participant has no registration
- **WHEN** Google exposes an anonymous or unregistered participant
- **THEN** the system retains that record and its available attendance details even without an email or CRM match

### Requirement: Any-entry attendance and reliable matching
A participant SHALL count as having attended if a returned join session indicates entry, regardless of duration. Automatic registration matching SHALL require reliable identity evidence and SHALL NOT rely solely on a display name. The owner SHALL review uncertain matches and be able to classify an unmatched record as an unregistered participant or host without fabricating a registration.

#### Scenario: Brief attendance
- **WHEN** a matched registrant enters briefly and leaves
- **THEN** the registrant is marked attended and the short duration remains visible

#### Scenario: Identical display names
- **WHEN** a participant name could refer to more than one registrant
- **THEN** the system preserves the record as unresolved until the owner reviews it

#### Scenario: Known unregistered participant
- **WHEN** the owner confirms that an unmatched participant is a host or an unregistered visitor
- **THEN** review is resolved without assigning the participant to an unrelated registrant

### Requirement: Completion and no-show safeguards
The system SHALL distinguish session lifecycle from attendance-import completeness. It SHALL finalize no-shows only after the relevant conference has ended, all import pages have succeeded, and uncertain identity reviews are resolved. Missing data, an active conference, or an API failure SHALL NOT constitute evidence of absence.

#### Scenario: Import fails midway
- **WHEN** some attendance pages succeed and another fails
- **THEN** the saved partial records remain visible, the import is incomplete, no-shows are not finalized, and follow-up dispatch remains blocked

#### Scenario: Session runs past planned end
- **WHEN** the scheduled duration has elapsed but the Meet conference is still active
- **THEN** the system continues to wait before finalizing attendance or permitting follow-up delivery

#### Scenario: No conference record available
- **WHEN** Google has not yet exposed a relevant conference record
- **THEN** the system shows attendance unavailable rather than declaring every registrant a no-show

### Requirement: Repeatable imports and review visibility
Repeated imports SHALL upsert by stable provider record identity, preserve owner review decisions, and expose last successful sync, imported counts, unresolved records, and failures. Corrections that change follow-up eligibility SHALL invalidate stale recipient approvals.

#### Scenario: Retry a completed page
- **WHEN** an import repeats already saved provider records
- **THEN** it updates the existing records without duplicating attendance rows or overwriting a valid owner match

#### Scenario: Attendance correction after email review
- **WHEN** an owner correction changes a registrant's attendee/no-show classification
- **THEN** an affected pending follow-up requires renewed review rather than using the old classification
