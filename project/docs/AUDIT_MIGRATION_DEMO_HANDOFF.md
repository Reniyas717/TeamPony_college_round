# Audit migration and two-owner demo handoff

This is the manual handoff for the tenant-isolation and audit integration. It is intentionally written for the hackathon Supabase project. It does not apply migrations or change application code.

## Migration order

Run the following files from project/supabase/migrations in this order. If some are already installed, inspect the installed schema and run only the missing files in the same dependency order.

1. 20261010_initial_schema.sql
2. 20261010_audit_logs_schema.sql
3. 20261011_webinar_foundation.sql
4. 20261011_workflow_engine.sql
5. 20261012_webinar_registration.sql
6. 20261013_journey_maps.sql
7. 20261013_webinar_delivery.sql
8. 20261014_webinar_attendance.sql
9. 20261015_webinar_feedback.sql
10. 20261016_google_provider_token_vault.sql
11. 20261017_webinar_followups.sql
12. 20261018_webinar_series_deletion.sql
13. 20261019_webinar_manual_worker.sql
14. 20261020_tenant_isolation_compatibility.sql
15. 20261021_atomic_crm_journey_rpc.sql
16. 20261022_atomic_website_rpc.sql

At inspection time, 20261022_atomic_website_rpc.sql is the newest migration in project/supabase/migrations. No later migration filename was present.

Do not rerun the legacy root CRM schema at supabase/migrations/001_crm_schema.sql after applying the isolation fixes. The compatibility migration is additive and removes the known permissive policies; rerunning the legacy CRM migration can recreate conflicting schema or policies. If that legacy migration was already applied historically, leave its data in place and apply the project migrations plus the compatibility migration once.

The compatibility migration is forward-only and preserves existing rows. It may report invalid legacy relationships or unknown CRM stage/status values for review. Run 20261021 only after 20261020; it replaces the checked audit function definition and adds CRM transaction functions. Run 20261022 after 20261021; it adds the audited website mutation functions described below.

## Inspected 20261021 function coverage

The inspected file contains these function definitions:

- nexus_atomic_owner_business_id(): resolves the authenticated owner's business.
- nexus_atomic_text_array(JSONB): converts a JSON array to a text array for the SQL functions.
- record_audit_log_tx(...): replaces the checked audit insertion function and keeps the 84-action and per-action metadata checks.
- create_crm_contact_transaction(...): creates a CRM contact and its required audit/activity records in one database function.
- update_crm_contact_transaction(UUID, JSONB): updates an owned CRM contact and records the required audit/activity records.
- delete_crm_contact_transaction(UUID): deletes an owned CRM contact and records the deletion event.
- create_crm_activity_transaction(UUID, TEXT, TEXT, TEXT, TEXT, JSONB): creates an owned CRM activity and audit event.
- update_crm_activity_transaction(UUID, JSONB): updates an owned CRM activity and audit event.
- delete_crm_activity_transaction(UUID): deletes an owned CRM activity and audit event.

No journey-map mutation function was found in the inspected file, despite journey appearing in the migration filename. Journey-map atomic coverage is therefore provisional and should not be claimed until a reviewed migration or runtime path supplies it.

The file explicitly revokes privileges for its helper functions, but does not show explicit grants or revokes for the six new CRM transaction function names. Check their installed privileges after migration before relying on them from the application. This is a source inspection finding, not a claim about the installed database.

## Inspected 20261022 website function coverage

The inspected file contains five owner-scoped SECURITY DEFINER functions. Each derives the business from auth.uid(), checks the owned website row, performs the website mutation, records the corresponding audit event through record_audit_log_tx, and returns the result or a safe not-found error:

- website_create_with_audit(TEXT, TEXT, JSONB, TEXT): creates a website and records website.created.
- website_save_with_audit(UUID, TEXT, TEXT, JSONB, BOOLEAN, TEXT[]): saves an owned website and records website.updated.
- website_publish_with_audit(UUID): publishes an owned website and records website.published.
- website_unpublish_with_audit(UUID): unpublishes an owned website and records website.unpublished.
- website_delete_with_audit(UUID): deletes an owned website and records website.deleted.

The migration revokes EXECUTE on all five functions from PUBLIC, anon, and authenticated, then grants EXECUTE only to authenticated. It also revokes INSERT, UPDATE, and DELETE on public.websites from PUBLIC, anon, and authenticated and grants authenticated SELECT. Website reads remain through the owner RLS policy; website writes are intended to pass through the audited RPCs.

This is source-level coverage only until 20261022 is executed and the installed function/table privileges are checked. The application runtime must also be verified to call these RPCs.

## Required database checks

Run project/supabase/verification/tenant_isolation_checks.sql after the migration. Replace the Owner A and Owner B UUID placeholders with two real Supabase auth user IDs before running the owner RLS sections.

Expected results:

- The listed business, CRM, journey, workflow, and audit tables exist with RLS enabled.
- The old permissive business/CRM policy names return zero rows.
- Legacy relationship checks return zero invalid new relationships. Any retained legacy rows reported for review must be understood before calling the data clean.
- Owner A queries return only Owner A's business records and audit rows.
- Owner B queries return only Owner B's business records and audit rows.
- Anonymous queries return zero visible rows for private business data and audit logs.
- Authenticated and anonymous roles have no direct INSERT, UPDATE, or DELETE grants on audit_logs, workflow_runs, and workflow_step_logs. Re-check journey_stage_actions separately: its permission state is migration-defined and may be affected by later integration work, so do not treat the existing verification query's row as a universal pass/fail expectation without comparing it with the installed migration grants.
- The normalized CRM email index and expected parent-child constraints are present.
- Unknown CRM stage/status values are either zero after review or explicitly documented as retained legacy values.

Run these additional exact checks in the Supabase SQL editor:

~~~sql
-- The replacement RPC must have 20 arguments.
SELECT to_regprocedure(
  'public.record_audit_log_tx(text,uuid,text,text,text,text,text,text,jsonb,text,text,text,text,timestamptz,text,text,text,text,text,integer)'
) AS audit_rpc;

-- Expected: one enabled immutable trigger.
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.audit_logs'::regclass
  AND tgname = 'trg_audit_logs_immutable'
  AND NOT tgisinternal;

-- Expected: one scope consistency check.
SELECT conname, convalidated, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.audit_logs'::regclass
  AND conname = 'audit_logs_scope_business_consistency_check';

-- Inspect the installed checked function. Confirm the 84 action values and
-- one per-action metadata allowlist are present.
SELECT pg_get_functiondef(
  'public.record_audit_log_tx(text,uuid,text,text,text,text,text,text,jsonb,text,text,text,text,timestamptz,text,text,text,text,text,integer)'::regprocedure
);

-- Expected: record_audit_log_tx is executable by authenticated and service_role,
-- but not by public or anon. The platform RPC is service_role-only.
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('record_audit_log_tx', 'record_platform_security_event')
ORDER BY routine_name, grantee;

-- Re-check journey_stage_actions after all migrations. Compare this result
-- with the installed migration policy/grant state before declaring it safe.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'journey_stage_actions'
ORDER BY grantee, privilege_type;

-- Inspect privileges for every new 20261021 CRM function.
SELECT p.oid::regprocedure AS function_name,
       has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_crm_contact_transaction',
    'update_crm_contact_transaction',
    'delete_crm_contact_transaction',
    'create_crm_activity_transaction',
    'update_crm_activity_transaction',
    'delete_crm_activity_transaction'
  )
ORDER BY function_name;

-- Inspect the five 20261022 website functions. Expected: authenticated_execute
-- is true; public_execute and anon_execute are false.
SELECT p.oid::regprocedure AS function_name,
       has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'website_create_with_audit',
    'website_save_with_audit',
    'website_publish_with_audit',
    'website_unpublish_with_audit',
    'website_delete_with_audit'
  )
ORDER BY function_name;

-- Expected: no browser-role direct website writes; authenticated SELECT remains.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'websites'
  AND grantee IN ('public', 'anon', 'authenticated')
ORDER BY grantee, privilege_type;
~~~

For the routine grant check, confirm:

- record_audit_log_tx: authenticated and service_role only.
- record_platform_security_event: service_role only.
- No public or anon execute grant.
- The service-role audit branch accepts only the fixed public integration actor/actions and fixed webinar.manual-worker system actions.
- The public registration notification action is aligned: webinar.notification.queued uses the fixed public registration actor and requires an owned registration row.
- The 20261021 CRM functions are present in source but the migration is still unexecuted; their installed grants and worker/runtime SQL remain unvalidated.

The SQL function definition should show per-action metadata checks for all 84 catalog values. Compare it with project/lib/validations/audit-actions.ts and project/docs/AUDIT_ACTION_CATALOG.md if the installed function differs.

## Two-owner demo flow

### Preflight

1. Create or use two Supabase Google accounts: Owner A and Owner B.
2. Confirm each account has exactly one Nexus business.
3. Keep the Owner A and Owner B user IDs available for the verification SQL.
4. Use test email addresses and a test webinar. The manual worker is intentionally owner-triggered; no cron job is required.

### Owner A

1. Sign in with Google and confirm the business workspace loads.
2. Create a CRM lead, edit its company or stage, and add a note. Refresh and confirm the saved record remains.
3. Create or edit a website and save the change. If the demo environment is configured for it, publish and unpublish the website.
4. Generate a customer journey map, edit a stage, approve or dismiss one proposed action, refresh, and confirm the saved state.
5. Create an AI workflow, trigger it manually, refresh the detail page, and approve a paused run. Show that the workflow run and step results are restored after reload. Use simulated or supported demo capabilities only.
6. Create and schedule a webinar. Open the public registration link in an anonymous or incognito browser and register a test attendee.
7. Import Google Meet attendance for the webinar, review a participant, and show the attendee/no-show state.
8. Enable the optional follow-up service, review the attendee/no-show message settings, and schedule the follow-up. Keep event notifications independent from this optional setting.
9. Use the owner-triggered manual email worker with test recipients if email delivery is configured. Show provider accepted, failed, or Needs review outcomes without claiming that an uncertain provider result was rolled back.
10. Open the audit viewer. Show the matching CRM, website, journey, workflow, webinar, attendance, follow-up, and worker events. Confirm worker rows use actor type system and actor ID webinar.manual-worker; public registration rows use integration attribution.

### Owner B isolation check

1. Sign in as Owner B and confirm Owner A's CRM contacts, websites, journey maps, workflows, webinars, and audit rows are absent.
2. Try opening one Owner A resource URL or calling its private API ID from Owner B. The request must be rejected or return not found without revealing the record.
3. Create one Owner B CRM record or webinar and confirm it appears only in Owner B's views and audit history.
4. If Owner B has queued email jobs, run the manual worker and confirm it processes only Owner B's business jobs. It must not claim Owner A's jobs.
5. Run the verification SQL again and confirm the two-owner and anonymous results match the expected isolation.

### What the demo must say accurately

The demo can show persisted owner isolation, audit attribution, metadata filtering, append-only protection, public/private webinar boundaries, and manual worker ownership. It must not claim that every domain mutation and its audit row commit atomically: several application paths still mutate first and audit in a separate call. The current implementation also does not add a scheduled worker.

## Local verification status

The local production build is currently blocked by environment prerequisites:

- intelligence-client.tsx references Mermaid. The current package.json and lockfile declare Mermaid, but node_modules/mermaid is absent and registry access was blocked, so the dependency could not be installed for the local build.
- next/font/google needs to fetch Google Fonts during the build, but the environment cannot reach the font service.

Do not report the production build as passing until those dependencies and network access are available.
