## ADDED Requirements

### Requirement: Verified owner context for private operations
The system SHALL authenticate private business requests using the existing server session and verified user identity, resolve the single business owned by that user, and use that context for reads, mutations, related records, and audit attribution. Private APIs SHALL return 401 without a verified session, 404 when the authenticated account has no business, and a safe error when context lookup fails. They SHALL NOT substitute a default business or accept client-supplied business, owner, or executor identity as authority.

#### Scenario: Owner loads business records
- **WHEN** an authenticated owner requests CRM, website, webinar, journey-map, workflow, or audit records
- **THEN** the returned records belong only to the business resolved from that owner's verified session

#### Scenario: Anonymous business request
- **WHEN** a visitor without a valid session requests a private business API, including workflow generation, trigger, run inspection, or approval
- **THEN** the API returns 401 before reading private data, calling an AI provider, or performing a business operation

#### Scenario: Supplied identity is untrusted
- **WHEN** an owner supplies another business ID or actor identity in the request
- **THEN** the system rejects unsupported identity fields or ignores them as authority and performs no operation under that supplied identity

### Requirement: Resource and relationship isolation
The system SHALL scope each private entity lookup or mutation by resource ID and verified business ID. Child records SHALL be checked against their owned parent resources, including CRM activities, webinar participants, journey stages/actions, workflow runs/steps, and approvals. Responses to cross-business identifiers SHALL NOT disclose the other business's private data.

#### Scenario: Another owner's contact
- **WHEN** owner A requests or changes a contact belonging to owner B
- **THEN** the operation returns a safe not-found or forbidden response and owner B's record is unchanged

#### Scenario: Mismatched workflow run and URL
- **WHEN** a workflow approval request supplies a run that does not belong to the owned workflow identified in the route
- **THEN** the system rejects the request and does not approve or execute that run

#### Scenario: Cross-business parent-child link
- **WHEN** a write attempts to link an owned child record to another business's parent
- **THEN** service validation and database constraints or checked RPC logic prevent the relationship from being committed

### Requirement: Restricted database authority
Ordinary owner operations SHALL use a session-scoped database client and owner RLS or checked owner mutation RPCs. Privileged access SHALL be limited to explicit server-only identity provisioning, credential integration, and worker paths with verified authority and business scope. Database migrations SHALL remove known legacy allow-all policies and restrict security-definer function execution and direct table writes where required for authoritative audit and approval decisions.

#### Scenario: Legacy permissive policies were installed
- **WHEN** the new isolation migration is applied after the root CRM migration
- **THEN** allow-all policies on businesses, CRM contacts, and CRM activities no longer permit unrelated owners or anonymous callers to access those records

#### Scenario: Direct database access
- **WHEN** owner A accesses business tables or approved owner RPCs directly using their session
- **THEN** the database still denies owner B's resources and prevents forged audit identities or approval authority

#### Scenario: Secret credentials in browser code
- **WHEN** browser code uses a private business endpoint
- **THEN** service-role keys and Google provider credentials remain server-side and the request receives only the allowed application response

### Requirement: Public and worker operations have explicit scope
Public registration and feedback SHALL derive business and resource context from their validated existing public slug or feedback token and expose only the current permitted public fields. Manual owner email processing SHALL derive the business from the session. The internal worker SHALL require its existing verified server secret and use the claimed job's persisted business context, without treating client identifiers as authority.

#### Scenario: Public registration for a different session
- **WHEN** a public registration submits session identifiers outside the validated standalone session or series
- **THEN** the system rejects the selection without exposing private management records or creating cross-business registration links

#### Scenario: Public feedback token
- **WHEN** a feedback request presents an invalid token or attempts to override the token's registration/business context
- **THEN** the system rejects the request and leaves feedback and consent unchanged

#### Scenario: Owner processes queued email
- **WHEN** owner A triggers the manual email worker
- **THEN** only eligible jobs belonging to owner A's business are claimed and processed

### Requirement: Legacy default records are preserved without fallback access
The system SHALL preserve existing records and audit history assigned to the legacy default business. Ordinary requests SHALL NOT fall back to those records when owner context or persistence is unavailable. Reassigning legacy business records SHALL require an explicit verified ownership mapping and SHALL NOT rewrite immutable audit history.

#### Scenario: Existing default-business records
- **WHEN** an owner signs in after the isolation change is installed
- **THEN** their ordinary business views exclude unmapped default-business records and those legacy records remain stored

#### Scenario: Business resolution fails
- **WHEN** the database cannot resolve an owner's business
- **THEN** the API returns a safe failure rather than reading or writing the shared default business
