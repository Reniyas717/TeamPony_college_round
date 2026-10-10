## ADDED Requirements

### Requirement: Owner-isolated management
The system SHALL let an authenticated business owner access only sessions, series, and private webinar records belonging to their business, using server-verified identity and owner-scoped database policies. Public registration and feedback access SHALL NOT expose private management records.

#### Scenario: Owner opens webinar management
- **WHEN** an authenticated owner opens the webinar destination from the dashboard
- **THEN** the system displays that business's sessions and series with actions appropriate to their current states

#### Scenario: Cross-business identifier
- **WHEN** an owner requests another business's session or related private record
- **THEN** the system denies access without returning that record or allowing a mutation

#### Scenario: Unauthenticated management access
- **WHEN** an unauthenticated visitor requests an owner page or management API
- **THEN** the page redirects to login and the API returns an unauthorized response

### Requirement: Session drafts and valid schedules
The system SHALL support session drafts without a scheduled start. Scheduling SHALL require a title, description, presenter, start date/time, timezone, positive duration, and a provisioned Meet link. The system SHALL retain the chosen timezone and display start/end times with an explicit timezone.

#### Scenario: Save an unscheduled draft
- **WHEN** the owner saves a new session without selecting a schedule
- **THEN** the session remains a draft and does not accept public registrations or send event emails

#### Scenario: Schedule a complete draft
- **WHEN** the owner schedules a valid draft and Meet provisioning succeeds
- **THEN** the session becomes scheduled with its own Meet link and registration page

#### Scenario: Invalid or ambiguous time
- **WHEN** a schedule contains invalid data or an unresolved ambiguous/nonexistent local time
- **THEN** the system requests correction instead of silently selecting a different time

### Requirement: Session and series organization
The system SHALL support standalone sessions and series containing separately titled and scheduled sessions. A series SHALL provide a single registration entry point with session selection; all registrations, attendance, follow-ups, and feedback SHALL remain session-specific.

#### Scenario: Series with multiple sessions
- **WHEN** the owner creates a series with two sessions
- **THEN** each session retains its own schedule, limits, Meet link, and lifecycle while sharing the series registration entry point

### Requirement: Lifecycle changes and affected-recipient review
The system SHALL support editing, scheduling, rescheduling, cancellation, and completion states. Before a reschedule or cancellation with registrants is committed, the owner SHALL review the exact changes and affected recipients. The commit SHALL enqueue the corresponding event notifications and reject a stale approval preview.

#### Scenario: Reschedule with registrants
- **WHEN** the owner confirms a current reschedule preview
- **THEN** the new schedule and matching notifications are persisted consistently and the registration page displays the new times

#### Scenario: Cancellation retains history
- **WHEN** the owner confirms cancellation
- **THEN** the session becomes cancelled, closes registration, stops pending follow-ups, retains its records, and enqueues cancellation notifications independently of follow-up settings

#### Scenario: Preview becomes stale
- **WHEN** session or recipient data changes after an approval preview
- **THEN** confirmation requires a refreshed preview rather than executing a different action from the one reviewed

### Requirement: Permanent deletion with explicit consequences
The system SHALL require explicit confirmation before permanently deleting a session or series, showing the scope and record counts. Successful session deletion SHALL remove its webinar-specific registration, attendance, feedback, follow-up, and pending work records. Series deletion SHALL include all its sessions. Shared CRM contacts and independent marketing consent SHALL survive. Already-sent emails and external Meet history SHALL NOT be represented as retracted.

#### Scenario: Delete one session
- **WHEN** the owner confirms deletion and no external operation is in flight
- **THEN** the session and its webinar-specific records disappear, its public links cease functioning, pending emails cannot dispatch, and shared contacts and consent remain

#### Scenario: Delete an entire series
- **WHEN** the owner confirms deletion of a series
- **THEN** every session in the series and its webinar-specific records are removed without deleting other series or shared contacts

#### Scenario: Concurrent external effect
- **WHEN** deletion is requested while a sender or Meet operation is in flight
- **THEN** the system waits for a safe outcome or reports a retryable conflict and does not claim deletion completed while work can still execute

### Requirement: Honest, accessible owner views
The system SHALL provide a session/series list and session details covering overview, registration, attendance, follow-up, and feedback/outcome counts. It SHALL follow Nexus typography, tokens, mobile patterns, keyboard/focus behavior, reduced motion, and loading/empty/error states. Metrics SHALL show their denominators and incomplete data SHALL be labeled.

#### Scenario: Attendance is unavailable
- **WHEN** the owner opens a session whose attendance import is pending or failed
- **THEN** the view shows the actual import state rather than reporting zero attendees as a finalized outcome

#### Scenario: Mobile management
- **WHEN** the owner uses a narrow viewport or keyboard navigation
- **THEN** the management controls and record views remain usable with labeled controls, explicit timezone text, and visible focus
