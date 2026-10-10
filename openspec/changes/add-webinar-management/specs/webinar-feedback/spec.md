## ADDED Requirements

### Requirement: Participant-specific feedback access
The system SHALL provide a Nexus feedback page linked from the attendee follow-up. Access SHALL be scoped by a non-guessable participant/session token and SHALL NOT require a Nexus login or expose other participants. Unavailable or deleted session links SHALL not accept feedback.

#### Scenario: Attendee opens feedback
- **WHEN** a participant opens a valid feedback link for a completed session
- **THEN** the page displays that session and accepts that participant's feedback only

#### Scenario: Invalid or deleted link
- **WHEN** a visitor opens an invalid token or a link whose webinar has been deleted
- **THEN** the page returns an unavailable state without revealing participant data

### Requirement: Useful structured feedback
Feedback SHALL capture a rating, usefulness, optional comments, and product/subscription interest. Submission SHALL be validated and confirmed only after persistence. One participant/session SHALL have one response record, with repeated submissions updating that record rather than inflating counts.

#### Scenario: Submit attendee feedback
- **WHEN** a participant submits valid feedback
- **THEN** the response is saved for that session and becomes visible to its owner

#### Scenario: Repeat submission
- **WHEN** the same participant resubmits through the same valid link
- **THEN** the existing response is updated without creating an additional response count

### Requirement: Separate future marketing choice
The feedback form SHALL show future marketing consent as an optional unchecked control distinct from rating, usefulness, and product interest. Product interest SHALL NOT grant future marketing permission. Affirmative marketing choices SHALL persist independently of webinar-specific feedback.

#### Scenario: Interested in the product without marketing opt-in
- **WHEN** a participant records purchase interest while leaving future marketing unchecked
- **THEN** the owner sees product interest but no new marketing permission is granted

#### Scenario: Opt-in survives webinar deletion
- **WHEN** an opted-in participant's webinar is deleted
- **THEN** the webinar-specific feedback is removed while the participant's independent marketing consent remains

### Requirement: Optional product destination
The owner SHALL be able to configure an optional product/purchase URL. The system SHALL validate the destination and display it when configured without claiming that interest or a link click proves a purchase.

#### Scenario: Product URL configured
- **WHEN** a participant opens feedback for a session with a valid product URL
- **THEN** the page offers the product link and records feedback/interest independently of any checkout

#### Scenario: No product URL configured
- **WHEN** no product URL has been supplied
- **THEN** feedback and product-interest collection remain available without a broken purchase control

### Requirement: Owner feedback outcomes
The owner SHALL be able to inspect session-specific responses and totals, including ratings, usefulness, response counts, product-interest counts, and distinct consent. Aggregates SHALL include their relevant denominators and SHALL NOT fabricate conversion metrics.

#### Scenario: Owner reviews session outcomes
- **WHEN** the owner opens a session's feedback/outcome view
- **THEN** the system shows only that business's persisted responses and labeled aggregates
