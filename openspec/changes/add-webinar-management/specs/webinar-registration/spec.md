## ADDED Requirements

### Requirement: Native public registration forms
The system SHALL provide a Nexus registration form for each scheduled standalone session and one form per series. Visitors SHALL register using name and email without needing a Nexus account. Series visitors SHALL choose one or more available sessions.

#### Scenario: Standalone registration
- **WHEN** a visitor submits valid name and email to an open session
- **THEN** the system persists the registration and displays success only after the server confirms it

#### Scenario: Selected sessions in a series
- **WHEN** a visitor submits a series form selecting two sessions
- **THEN** the system creates registrations for those sessions only and records each separately

### Requirement: Public scope and input validation
Public endpoints SHALL resolve their business/session scope from a valid public session or series reference, validate all inputs and selected session membership, expose only public event data, and protect against abusive submission rates. Client-supplied business or owner identifiers SHALL NOT establish authority.

#### Scenario: Forged session selection
- **WHEN** a series submission includes a session from another series or business
- **THEN** the system rejects the submission without writing registrations or exposing private records

#### Scenario: Draft or cancelled session
- **WHEN** a visitor requests registration for a draft, cancelled, deleted, or otherwise unavailable session
- **THEN** the system does not accept the registration and shows an appropriate unavailable state

### Requirement: Per-session duplicate prevention
The system SHALL prevent more than one registration per normalized email and session, including concurrent and retried requests. Duplicate requests SHALL NOT create duplicate confirmation deliveries.

#### Scenario: Retried submission
- **WHEN** a visitor or browser retries a previously successful registration
- **THEN** the existing reservation is reused and no additional reservation or confirmation email is created

### Requirement: Capacity and registration deadlines
The owner SHALL be able to set optional capacity and a registration deadline per session. Without a custom deadline, registration SHALL close at the scheduled start. The system SHALL enforce capacity and deadlines atomically at submission time, including selected sessions in a series.

#### Scenario: Final place is contested
- **WHEN** two submissions compete for the last available place
- **THEN** at most one new registration succeeds and capacity is not exceeded

#### Scenario: Deadline reached
- **WHEN** a submission arrives at or after the session's effective registration deadline
- **THEN** the system rejects it even if the visitor opened the form earlier

#### Scenario: One selected session is unavailable
- **WHEN** a series submission includes a full or closed session
- **THEN** the system identifies the unavailable selection and makes no new partial reservations until the visitor corrects and resubmits it

### Requirement: Shared contact linkage and distinct consent
Registration SHALL resolve or create a business-scoped CRM contact through the shared contact seam without overwriting existing customer status. The optional future marketing choice SHALL be unchecked by default and persist as separate consent. An unchecked choice SHALL NOT grant consent or erase an earlier independent opt-in.

#### Scenario: Existing customer registers
- **WHEN** an existing business contact registers for a session
- **THEN** the registration links to that contact while preserving its existing business lifecycle data

#### Scenario: Marketing choice left unchecked
- **WHEN** a visitor registers without selecting future marketing
- **THEN** the system records the event registration without creating a future marketing permission

### Requirement: Independent confirmation enqueue
A successful registration SHALL persist a confirmation delivery containing the selected session's schedule and Meet link through the shared delivery infrastructure, regardless of optional follow-up settings. Provider failure SHALL NOT remove a successfully persisted registration.

#### Scenario: Follow-ups disabled
- **WHEN** a registration succeeds for a session with follow-ups disabled
- **THEN** its event confirmation is still queued

#### Scenario: Email provider unavailable
- **WHEN** delivery fails after registration commits
- **THEN** the registration remains valid and the owner can see delivery failure or pending retry
