-- Focused, read-only verification for
-- 20261020_tenant_isolation_compatibility.sql (OpenSpec task 2.5).
--
-- Run in a privileged SQL session after replacing the two UUID literals below
-- with real owners. The script never updates, deletes, resets, or reassigns
-- application rows. RLS assertions require a session that can SET ROLE to
-- authenticated/anon, such as a Supabase SQL editor session.

-- 1. Schema and policy inventory: expected rows should be present.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'businesses', 'crm_contacts', 'crm_activities',
    'customer_journey_maps', 'journey_map_stages', 'journey_stage_actions',
    'automation_workflows', 'workflow_runs', 'workflow_step_logs', 'audit_logs'
  )
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'businesses', 'crm_contacts', 'crm_activities',
    'customer_journey_maps', 'journey_map_stages', 'journey_stage_actions',
    'automation_workflows', 'workflow_runs', 'workflow_step_logs', 'audit_logs'
  )
ORDER BY tablename, policyname;

-- These must return zero rows.
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'Allow access to business',
    'Allow access to crm_contacts',
    'Allow access to crm_activities'
  );

-- 2. Legacy relationship report. Rows are retained for explicit review;
-- NOT VALID foreign keys block new invalid relationships.
SELECT 'journey_stage_business_map' AS check_name, COUNT(*) AS invalid_rows
FROM public.journey_map_stages s
LEFT JOIN public.customer_journey_maps m
  ON m.id = s.journey_map_id AND m.business_id = s.business_id
WHERE m.id IS NULL
UNION ALL
SELECT 'journey_action_business_stage_map', COUNT(*)
FROM public.journey_stage_actions a
LEFT JOIN public.journey_map_stages s
  ON s.id = a.stage_id
 AND s.journey_map_id = a.journey_map_id
 AND s.business_id = a.business_id
WHERE s.id IS NULL
UNION ALL
SELECT 'workflow_run_business_workflow', COUNT(*)
FROM public.workflow_runs r
LEFT JOIN public.automation_workflows w
  ON w.id = r.workflow_id AND w.business_id = r.business_id
WHERE w.id IS NULL
UNION ALL
SELECT 'workflow_step_business_run_workflow', COUNT(*)
FROM public.workflow_step_logs s
LEFT JOIN public.workflow_runs r
  ON r.id = s.run_id AND r.business_id = s.business_id
LEFT JOIN public.automation_workflows w
  ON w.id = s.workflow_id AND w.business_id = s.business_id
WHERE r.id IS NULL OR w.id IS NULL OR r.workflow_id <> s.workflow_id;

-- 3. Replace these values before running the RLS checks.
-- Owner A: 11111111-1111-1111-1111-111111111111
-- Owner B: 22222222-2222-2222-2222-222222222222

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT 'owner_a_businesses' AS check_name, id, owner_id
FROM public.businesses
ORDER BY id;
SELECT 'owner_a_contacts' AS check_name, id, business_id, lower(trim(email)) AS normalized_email
FROM public.crm_contacts
ORDER BY id;
SELECT 'owner_a_journeys' AS check_name, id, business_id
FROM public.customer_journey_maps
ORDER BY id;
SELECT 'owner_a_runs' AS check_name, id, workflow_id, business_id
FROM public.workflow_runs
ORDER BY id;
SELECT 'owner_a_audit' AS check_name, id, business_id, action
FROM public.audit_logs
ORDER BY created_at, id;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT 'owner_b_businesses' AS check_name, id, owner_id
FROM public.businesses
ORDER BY id;
SELECT 'owner_b_contacts' AS check_name, id, business_id, lower(trim(email)) AS normalized_email
FROM public.crm_contacts
ORDER BY id;
SELECT 'owner_b_journeys' AS check_name, id, business_id
FROM public.customer_journey_maps
ORDER BY id;
SELECT 'owner_b_runs' AS check_name, id, workflow_id, business_id
FROM public.workflow_runs
ORDER BY id;
SELECT 'owner_b_audit' AS check_name, id, business_id, action
FROM public.audit_logs
ORDER BY created_at, id;
ROLLBACK;

BEGIN;
SET LOCAL ROLE anon;
RESET request.jwt.claim.sub;
SELECT 'anonymous_businesses' AS check_name, COUNT(*) AS visible_rows FROM public.businesses;
SELECT 'anonymous_contacts' AS check_name, COUNT(*) AS visible_rows FROM public.crm_contacts;
SELECT 'anonymous_journeys' AS check_name, COUNT(*) AS visible_rows FROM public.customer_journey_maps;
SELECT 'anonymous_runs' AS check_name, COUNT(*) AS visible_rows FROM public.workflow_runs;
SELECT 'anonymous_audit' AS check_name, COUNT(*) AS visible_rows FROM public.audit_logs;
ROLLBACK;

-- Unknown CRM stages/statuses must be zero only after an explicit owner review;
-- this migration intentionally preserves and reports non-canonical values.
SELECT stage, status, COUNT(*) AS retained_rows
FROM public.crm_contacts
WHERE stage NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned')
   OR status NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned')
GROUP BY stage, status
ORDER BY stage, status;

-- 4. Direct-write and function-grant checks.
-- Audit/workflow tables remain read-only to authenticated. CRM and journey
-- direct writes are intentionally retained in this slice because the current
-- services still use table mutations; the RPC cutover must remove these grants.
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'audit_logs', 'workflow_runs', 'workflow_step_logs',
    'crm_contacts', 'crm_activities', 'customer_journey_maps',
    'journey_map_stages', 'journey_stage_actions'
  )
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
ORDER BY grantee, table_name, privilege_type;

-- Expected now: no authenticated direct writes on audit/workflow tables;
-- CRM/journey rows are the explicitly reported staged-cutover exception.
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('audit_logs', 'workflow_runs', 'workflow_step_logs')
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
ORDER BY grantee, table_name, privilege_type;

-- The following RPCs must exist and be executable only by authenticated
-- owners (except the shared audit RPC, which also has its restricted
-- service-role integration grant).
SELECT p.oid::regprocedure AS function_name,
       has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_crm_contact_transaction', 'update_crm_contact_transaction',
    'delete_crm_contact_transaction', 'create_crm_activity_transaction',
    'update_crm_activity_transaction', 'delete_crm_activity_transaction',
    'generate_customer_journey_map_transaction', 'add_journey_stage_transaction',
    'update_journey_stage_transaction', 'delete_journey_stage_transaction',
    'decide_journey_action_transaction', 'record_audit_log_tx',
    'record_platform_security_event', 'enqueue_webinar_email',
    'claim_webinar_email_jobs', 'claim_webinar_email_jobs_for_business',
    'mark_webinar_email_provider_accepted', 'mark_webinar_email_failed',
    'mark_webinar_email_unknown', 'validate_webinar_followup_email',
    'mark_webinar_email_blocked'
  )
ORDER BY function_name;

SELECT p.oid::regprocedure AS function_name,
       has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'record_audit_log_tx', 'record_platform_security_event', 'enqueue_webinar_email',
    'claim_webinar_email_jobs', 'claim_webinar_email_jobs_for_business',
    'mark_webinar_email_provider_accepted', 'mark_webinar_email_failed',
    'mark_webinar_email_unknown', 'validate_webinar_followup_email',
    'mark_webinar_email_blocked'
  )
ORDER BY function_name;

-- 5. Normalized email and FK status checks.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'crm_contacts_business_normalized_email_key',
    'businesses_owner_id_unique',
    'customer_journey_maps_business_id_key',
    'journey_map_stages_business_map_id_key',
    'workflow_runs_business_id_key',
    'workflow_step_logs_business_id_key'
  )
ORDER BY indexname;

SELECT conname, convalidated
FROM pg_constraint
WHERE conname IN (
  'audit_logs_scope_business_consistency_check',
  'crm_activities_contact_business_fk',
  'journey_stages_business_map_fk',
  'journey_actions_business_map_fk',
  'journey_actions_business_stage_map_fk',
  'workflow_runs_business_workflow_fk',
  'workflow_steps_business_run_fk',
  'workflow_steps_business_workflow_fk'
)
ORDER BY conname;

SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
  AND column_name IN ('scope', 'business_id')
ORDER BY column_name;

-- Audit history must not be erased by business deletion.
SELECT conname, pg_get_constraintdef(oid) AS definition, convalidated
FROM pg_constraint
WHERE conrelid = 'public.audit_logs'::regclass
  AND conname = 'audit_logs_business_id_fkey';

-- Atomicity handoff: these remain outside this migration because the current
-- services still perform direct writes or use separate service paths:
-- website mutations, workflow definition/run/approval mutations, webinar
-- registration/feedback transactions, and the CRM/journey application
-- cutover from direct table writes to the RPCs above.
