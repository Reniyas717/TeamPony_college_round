## ADDED Requirements

### Requirement: Supabase is the source of truth for demo business records
Existing operational features SHALL save and read real owner-specific Supabase records. Shared process-memory maps, contacts, workflows, runs, and step logs SHALL NOT replace failed persistence in application business paths. Temporary form/view state SHALL remain client-local where appropriate. A failed database operation SHALL return a safe error and SHALL NOT fabricate a successful save.

#### Scenario: Database save fails
- **WHEN** a business operation cannot persist its data
- **THEN** the owner receives an explicit failure and no process-memory fallback is represented as a successful database save

#### Scenario: Record survives application reload
- **WHEN** an owner creates a contact or journey, reloads the page, or restarts the application server
- **THEN** the existing saved record is retrieved from Supabase under that owner's business

### Requirement: CRM compatibility and webinar lead visibility
Additive migrations SHALL provide the CRM columns and activity table needed by the current service/UI without reinstating legacy public policies. The system SHALL map the CRM stage/status representation consistently for manually created contacts and contacts created by public webinar registration, preserving existing valid data and normalized-email deduplication rules. Contact activities SHALL remain scoped to their owned contact and business.

#### Scenario: Database began with application migrations
- **WHEN** compatibility migrations are applied to a database without the legacy root CRM extensions
- **THEN** the existing contact fields, activity timeline, and stage filters have the required schema without requiring the permissive root migration

#### Scenario: Webinar registration creates a lead
- **WHEN** a visitor registers for an owner's webinar and the registration flow creates or reuses a CRM contact
- **THEN** the contact appears in that owner's CRM with a consistent stage and remains hidden from other owners

### Requirement: Journey maps and edits persist with valid identifiers
Journey creation SHALL use database-compatible identifiers and explicit mapping between the database fields and current UI contract. Creation of maps, stages, and proposed actions SHALL be consistent. Existing add/edit/delete stage operations SHALL use authenticated API/service persistence instead of client-only updates. Approving a proposal SHALL record an approval decision and SHALL NOT claim that a website, campaign, CRM rule, or webinar was changed unless a real supported operation was executed.

#### Scenario: Generate and reopen a journey
- **WHEN** an owner generates a journey and reloads its page
- **THEN** its summary, ordered stages, stage details, and proposed actions are loaded from the database in the expected UI shape

#### Scenario: Save a stage edit
- **WHEN** an owner changes a stage's objective or friction points and saves successfully
- **THEN** those values survive reload and the audit event describes the real saved change

#### Scenario: Approve an unimplemented module proposal
- **WHEN** an owner approves a journey suggestion without a supported execution path
- **THEN** the saved result states that the proposal was approved and does not report a deployed optimization or external operation

### Requirement: Workflow run and approval records survive reload
Existing manually triggered workflow runs, step outcomes, current approval position, and approval/rejection decisions SHALL use the existing workflow tables with valid database identifiers and owned relationships. Run inspection and approval SHALL remain available after a page reload or server restart. Persisted operational payloads SHALL be validated and exclude credentials; central audit metadata SHALL additionally satisfy its action allowlist. AI steps SHALL preserve their initiating owner and any verified approver.

#### Scenario: Run waits for approval
- **WHEN** a manually triggered workflow reaches an approval gate and the owner reloads the page
- **THEN** the pending run and its previous step results are available from Supabase and the owner can review the current gate

#### Scenario: Another owner requests a run
- **WHEN** a different owner requests a persisted run or attempts to approve it
- **THEN** the operation is denied and no step or decision is changed

#### Scenario: Unsupported or simulated capability
- **WHEN** the existing executor encounters an unsupported capability or uses a configured demonstration simulation
- **THEN** its stored result and owner view identify the unsupported or simulated behavior rather than claiming a real completed business effect

### Requirement: Additive migration and minimal demo scope
The system SHALL deliver versioned migrations under project/supabase/migrations with documented dependency order and verification steps. These migrations SHALL preserve legacy records and audit history, remove unsafe legacy grants/policies where required, and support existing operational demonstrations without requiring a new scheduler, event bus, billing product, campaign editor, or complete DAG execution redesign.

#### Scenario: Legacy database is upgraded
- **WHEN** the documented new migrations are applied after previously installed project or root migrations
- **THEN** necessary schema compatibility and isolation are installed without guessing ownership or deleting old business/audit records

#### Scenario: Migration handoff without remote database access
- **WHEN** the implementation cannot access the live Supabase database
- **THEN** the developer receives exact new filenames, order, and remaining verification steps, and the implementation report does not claim those migrations were remotely applied
