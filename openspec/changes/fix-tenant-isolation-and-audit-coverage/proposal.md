## Why

The hackathon demo currently mixes verified owner records with a shared default business, privileged database access, process-memory fallbacks, and incomplete audit coverage. Existing features need to save real records for the correct owner and leave an accurate audit trail so the team can demonstrate integrated business operations reliably.

## What Changes

- Resolve the signed-in owner and their business through one server-only context boundary, then scope every existing private read and mutation to that business.
- Remove legacy allow-all database policies and restrict public RPC, audit insertion, and privileged worker authority while preserving old default-business records and historical audit events.
- Establish central audit action contracts, per-action metadata allowlists, and verified executor, initiator, and approver attribution across authentication, Google connection, CRM, websites, webinars, public registration/feedback, journey maps, workflows, and manual email delivery.
- Commit required audit records together with database mutations; record authorized intent and accurate provider outcomes for external operations, with a simple Needs review result when an outcome is uncertain.
- Include minimum persistence repairs: CRM schema compatibility and webinar lead visibility, database-compatible journey-map IDs/field mappings and saved edits, and persisted workflow runs/steps/approval state.
- **BREAKING**: Business requests no longer use a guessed default business or report successful saves backed only by shared process memory. Missing authentication and unavailable persistence return explicit errors.
- **BREAKING**: New pre-business security events use a validated platform scope with no business reference instead of SYSTEM_BUSINESS_ID. Owner audit queries exclude these events; existing history is preserved.
- Retain Supabase, the current Google OAuth flow, existing owner screens, and the manually triggered webinar email worker. Add no scheduler, distributed recovery system, separate audit store, or new product modules.

## Capabilities

### New Capabilities

- `tenant-isolation`: Verified owner context, scoped private access, database relationship/policy checks, and explicit public/worker authority across existing modules.
- `central-audit-logging`: Trusted audit attribution, platform security scope, metadata restrictions, immutable history, atomic mutation recording, and honest external-operation outcomes.
- `business-record-persistence`: Minimum CRM, journey-map, and workflow repairs needed for real owner-specific Supabase records and existing demo operations to survive reloads.

### Modified Capabilities

None. The repository has no established main specifications under `openspec/specs/`; existing webinar requirements remain in the separate `add-webinar-management` change and are preserved by this cross-module change.

## Impact

- Shared database/context helpers in `project/lib/supabase`, central audit validation/service, authenticated API routes, and services for CRM, websites, webinars, journey maps, workflows, notifications, and authentication.
- Existing CRM, journey-map, workflow, webinar, and audit screens where persistence or truthful outcomes require small UI/API adjustments; no general dashboard redesign.
- New additive SQL migrations under `project/supabase/migrations` for compatibility, isolation, restricted audit scope/permissions, and audited mutation RPCs. The legacy root CRM migration is not rerun or silently amended.
- Focused service/API and database verification using two synthetic owners; exact migration deployment instructions and type generation where tooling permits.
- No new dependency or external service is planned. Implementation is grounded in [the agreed plan](../../../docs/security-and-audit-plan.md) and [ADR 0001](../../../docs/adr/0001-platform-security-events-in-central-audit.md).
