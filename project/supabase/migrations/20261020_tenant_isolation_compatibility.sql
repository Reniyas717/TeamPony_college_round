-- Nexus additive compatibility and isolation migration.
--
-- Scope: OpenSpec tasks 2.1-2.4.
-- This migration is intentionally forward-only. It does not edit or rerun
-- supabase/migrations/001_crm_schema.sql and does not delete or reassign rows.
-- Apply after the project migrations through 20261019. The legacy root CRM
-- migration may also have been applied earlier; its allow-all policies are
-- removed below.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 2.1 CRM compatibility
-- -------------------------------------------------------------------------

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS value INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS next_action_text TEXT,
  ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Normalize known aliases while preserving unknown legacy values for review.
-- Unknown stages must remain visible to the owner and must not be silently
-- reinterpreted as lead.
UPDATE public.crm_contacts
SET stage = CASE lower(trim(COALESCE(NULLIF(stage, ''), NULLIF(status, ''), 'lead')))
  WHEN 'lead' THEN 'lead'
  WHEN 'new' THEN 'lead'
  WHEN 'contact' THEN 'contacted'
  WHEN 'contacted' THEN 'contacted'
  WHEN 'engaged' THEN 'contacted'
  WHEN 'qualified' THEN 'qualified'
  WHEN 'proposal' THEN 'proposal'
  WHEN 'negotiation' THEN 'proposal'
  WHEN 'customer' THEN 'customer'
  WHEN 'converted' THEN 'customer'
  WHEN 'active' THEN 'customer'
  WHEN 'churned' THEN 'churned'
  WHEN 'lost' THEN 'churned'
  ELSE COALESCE(NULLIF(stage, ''), NULLIF(status, ''), 'lead')
END;

UPDATE public.crm_contacts
SET status = CASE lower(trim(COALESCE(NULLIF(status, ''), stage)))
  WHEN 'lead' THEN 'lead'
  WHEN 'new' THEN 'lead'
  WHEN 'contact' THEN 'contacted'
  WHEN 'contacted' THEN 'contacted'
  WHEN 'engaged' THEN 'contacted'
  WHEN 'qualified' THEN 'qualified'
  WHEN 'proposal' THEN 'proposal'
  WHEN 'negotiation' THEN 'proposal'
  WHEN 'customer' THEN 'customer'
  WHEN 'converted' THEN 'customer'
  WHEN 'active' THEN 'customer'
  WHEN 'churned' THEN 'churned'
  WHEN 'lost' THEN 'churned'
  ELSE COALESCE(NULLIF(status, ''), stage)
END;

UPDATE public.crm_contacts
SET value = COALESCE(value, 0),
    source = COALESCE(NULLIF(source, ''), 'manual'),
    last_activity_at = COALESCE(last_activity_at, created_at, NOW());

ALTER TABLE public.crm_contacts
  ALTER COLUMN stage SET DEFAULT 'lead',
  ALTER COLUMN stage SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'lead',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN value SET DEFAULT 0,
  ALTER COLUMN value SET NOT NULL,
  ALTER COLUMN source SET DEFAULT 'manual',
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN last_activity_at SET DEFAULT NOW(),
  ALTER COLUMN last_activity_at SET NOT NULL;

DO $$
DECLARE
  unknown_stage_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unknown_stage_count
  FROM public.crm_contacts
  WHERE stage NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned')
     OR status NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned');
  IF unknown_stage_count > 0 THEN
    RAISE NOTICE
      'CRM contacts with unknown stage/status values retained for review: %',
      unknown_stage_count;
  END IF;
END $$;

-- Refuse to create a second uniqueness rule on top of ambiguous legacy data.
-- The rows remain untouched and the exception identifies the repair needed.
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT business_id, lower(trim(email)) AS normalized_email
    FROM public.crm_contacts
    GROUP BY business_id, lower(trim(email))
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'CRM normalized-email uniqueness cannot be installed: % duplicate business/email groups require explicit review',
      duplicate_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_business_normalized_email_key
  ON public.crm_contacts (business_id, lower(trim(email)));
CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_business_id_id_key
  ON public.crm_contacts (business_id, id);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS business_id UUID,
  ADD COLUMN IF NOT EXISTS contact_id UUID,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS actor TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE public.crm_activities
SET metadata = COALESCE(metadata, '{}'::jsonb),
    created_at = COALESCE(created_at, NOW());

ALTER TABLE public.crm_activities
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.crm_activities'::regclass
      AND conname = 'crm_activities_type_values_check'
  ) THEN
    ALTER TABLE public.crm_activities
      ADD CONSTRAINT crm_activities_type_values_check
      CHECK (type IN ('form_submission', 'stage_change', 'note', 'email_sent', 'ai_agent_action'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.crm_activities'::regclass
      AND conname = 'crm_activities_actor_values_check'
  ) THEN
    ALTER TABLE public.crm_activities
      ADD CONSTRAINT crm_activities_actor_values_check
      CHECK (actor IN ('owner', 'system', 'ai_agent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.crm_activities'::regclass
      AND conname = 'crm_activities_contact_business_fk'
  ) THEN
    ALTER TABLE public.crm_activities
      ADD CONSTRAINT crm_activities_contact_business_fk
      FOREIGN KEY (business_id, contact_id)
      REFERENCES public.crm_contacts (business_id, id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_created
  ON public.crm_activities (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_business_created
  ON public.crm_activities (business_id, created_at DESC);

-- -------------------------------------------------------------------------
-- 2.2 Journey-map and workflow compatibility fields
-- -------------------------------------------------------------------------

ALTER TABLE public.customer_journey_maps
  ADD COLUMN IF NOT EXISTS journey_type TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT;

UPDATE public.customer_journey_maps
SET journey_type = COALESCE(NULLIF(journey_type, ''), NULLIF(archetype, ''), 'custom'),
    summary = COALESCE(NULLIF(summary, ''), NULLIF(metadata->>'summary', ''), objective);

ALTER TABLE public.customer_journey_maps
  ALTER COLUMN journey_type SET DEFAULT 'custom',
  ALTER COLUMN journey_type SET NOT NULL,
  ALTER COLUMN summary SET DEFAULT '',
  ALTER COLUMN summary SET NOT NULL;

ALTER TABLE public.journey_map_stages
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS customer_needs TEXT[],
  ADD COLUMN IF NOT EXISTS findings_type TEXT;

UPDATE public.journey_map_stages
SET objective = COALESCE(NULLIF(objective, ''), description),
    customer_needs = COALESCE(customer_needs, '{}'::text[]),
    findings_type = COALESCE(NULLIF(findings_type, ''), 'hypothesis');

ALTER TABLE public.journey_map_stages
  ALTER COLUMN objective SET DEFAULT '',
  ALTER COLUMN objective SET NOT NULL,
  ALTER COLUMN customer_needs SET DEFAULT '{}'::text[],
  ALTER COLUMN customer_needs SET NOT NULL,
  ALTER COLUMN findings_type SET DEFAULT 'hypothesis',
  ALTER COLUMN findings_type SET NOT NULL;

ALTER TABLE public.journey_stage_actions
  ADD COLUMN IF NOT EXISTS why_it_helps TEXT,
  ADD COLUMN IF NOT EXISTS evidence_type TEXT,
  ADD COLUMN IF NOT EXISTS execution_result JSONB;

UPDATE public.journey_stage_actions
SET why_it_helps = COALESCE(NULLIF(why_it_helps, ''), 'Helps remove friction and guides the customer to the next journey step'),
    evidence_type = COALESCE(NULLIF(evidence_type, ''), 'hypothesis');

ALTER TABLE public.journey_stage_actions
  ALTER COLUMN why_it_helps SET DEFAULT 'Helps remove friction and guides the customer to the next journey step',
  ALTER COLUMN why_it_helps SET NOT NULL,
  ALTER COLUMN evidence_type SET DEFAULT 'hypothesis',
  ALTER COLUMN evidence_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.journey_map_stages'::regclass
      AND conname = 'journey_map_stages_findings_type_check'
  ) THEN
    ALTER TABLE public.journey_map_stages
      ADD CONSTRAINT journey_map_stages_findings_type_check
      CHECK (findings_type IN ('hypothesis', 'data_backed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.journey_stage_actions'::regclass
      AND conname = 'journey_stage_actions_evidence_type_check'
  ) THEN
    ALTER TABLE public.journey_stage_actions
      ADD CONSTRAINT journey_stage_actions_evidence_type_check
      CHECK (evidence_type IN ('hypothesis', 'data_backed'));
  END IF;
END $$;

ALTER TABLE public.automation_workflows
  ADD COLUMN IF NOT EXISTS initiated_by UUID,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_reason TEXT;

ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS initiated_by UUID,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_step_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS run_version INTEGER;

UPDATE public.workflow_runs
SET run_version = COALESCE(run_version, 1),
    last_step_at = COALESCE(last_step_at, completed_at, started_at);

ALTER TABLE public.workflow_runs
  ALTER COLUMN run_version SET DEFAULT 1,
  ALTER COLUMN run_version SET NOT NULL;

ALTER TABLE public.workflow_step_logs
  ADD COLUMN IF NOT EXISTS business_id UUID,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_context JSONB;

UPDATE public.workflow_step_logs step
SET business_id = run.business_id,
    started_at = COALESCE(step.started_at, step.executed_at),
    completed_at = CASE
      WHEN step.status IN ('SUCCESS', 'FAILED', 'SKIPPED') THEN COALESCE(step.completed_at, step.executed_at)
      ELSE step.completed_at
    END
FROM public.workflow_runs run
WHERE run.id = step.run_id
  AND step.business_id IS NULL;

ALTER TABLE public.workflow_step_logs
  ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.automation_workflows'::regclass
      AND conname = 'automation_workflows_initiated_by_fkey'
  ) THEN
    ALTER TABLE public.automation_workflows
      ADD CONSTRAINT automation_workflows_initiated_by_fkey
      FOREIGN KEY (initiated_by) REFERENCES auth.users(id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.automation_workflows'::regclass
      AND conname = 'automation_workflows_approved_by_fkey'
  ) THEN
    ALTER TABLE public.automation_workflows
      ADD CONSTRAINT automation_workflows_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES auth.users(id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_runs'::regclass
      AND conname = 'workflow_runs_initiated_by_fkey'
  ) THEN
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT workflow_runs_initiated_by_fkey
      FOREIGN KEY (initiated_by) REFERENCES auth.users(id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_runs'::regclass
      AND conname = 'workflow_runs_approved_by_fkey'
  ) THEN
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT workflow_runs_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2.3 Tenant policies and parent-child ownership constraints
-- -------------------------------------------------------------------------

DO $$
DECLARE
  duplicate_owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_owner_count
  FROM (
    SELECT owner_id
    FROM public.businesses
    WHERE owner_id IS NOT NULL
    GROUP BY owner_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_owner_count > 0 THEN
    RAISE EXCEPTION
      'Business ownership is ambiguous: % owners have multiple business rows; no rows were reassigned',
      duplicate_owner_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_owner_id_unique
  ON public.businesses (owner_id)
  WHERE owner_id IS NOT NULL;

-- Composite parent keys must exist before the matching foreign keys are added.
CREATE UNIQUE INDEX IF NOT EXISTS customer_journey_maps_business_id_key
  ON public.customer_journey_maps (business_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS journey_map_stages_business_map_id_key
  ON public.journey_map_stages (business_id, id, journey_map_id);
CREATE UNIQUE INDEX IF NOT EXISTS journey_stage_actions_business_id_key
  ON public.journey_stage_actions (business_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS automation_workflows_business_id_key
  ON public.automation_workflows (business_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS workflow_runs_business_id_key
  ON public.workflow_runs (business_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS workflow_step_logs_business_id_key
  ON public.workflow_step_logs (business_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.businesses'::regclass
      AND conname = 'businesses_owner_id_auth_fkey'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_owner_id_auth_fkey
      FOREIGN KEY (owner_id) REFERENCES auth.users(id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.journey_map_stages'::regclass
      AND conname = 'journey_stages_business_map_fk'
  ) THEN
    ALTER TABLE public.journey_map_stages
      ADD CONSTRAINT journey_stages_business_map_fk
      FOREIGN KEY (business_id, journey_map_id)
      REFERENCES public.customer_journey_maps (business_id, id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.journey_stage_actions'::regclass
      AND conname = 'journey_actions_business_map_fk'
  ) THEN
    ALTER TABLE public.journey_stage_actions
      ADD CONSTRAINT journey_actions_business_map_fk
      FOREIGN KEY (business_id, journey_map_id)
      REFERENCES public.customer_journey_maps (business_id, id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.journey_stage_actions'::regclass
      AND conname = 'journey_actions_business_stage_map_fk'
  ) THEN
    ALTER TABLE public.journey_stage_actions
      ADD CONSTRAINT journey_actions_business_stage_map_fk
      FOREIGN KEY (business_id, stage_id, journey_map_id)
      REFERENCES public.journey_map_stages (business_id, id, journey_map_id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_runs'::regclass
      AND conname = 'workflow_runs_business_workflow_fk'
  ) THEN
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT workflow_runs_business_workflow_fk
      FOREIGN KEY (business_id, workflow_id)
      REFERENCES public.automation_workflows (business_id, id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_step_logs'::regclass
      AND conname = 'workflow_steps_business_run_fk'
  ) THEN
    ALTER TABLE public.workflow_step_logs
      ADD CONSTRAINT workflow_steps_business_run_fk
      FOREIGN KEY (business_id, run_id)
      REFERENCES public.workflow_runs (business_id, id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_step_logs'::regclass
      AND conname = 'workflow_steps_business_workflow_fk'
  ) THEN
    ALTER TABLE public.workflow_step_logs
      ADD CONSTRAINT workflow_steps_business_workflow_fk
      FOREIGN KEY (business_id, workflow_id)
      REFERENCES public.automation_workflows (business_id, id)
      NOT VALID;
  END IF;
END $$;

-- Existing anomalies are retained and surfaced by the verification script;
-- NOT VALID foreign keys enforce the relationship for all new writes.
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.journey_map_stages s
  LEFT JOIN public.customer_journey_maps m
    ON m.id = s.journey_map_id AND m.business_id = s.business_id
  WHERE m.id IS NULL;
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Legacy journey stages with invalid business/map ownership: %', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM public.journey_stage_actions a
  LEFT JOIN public.journey_map_stages s
    ON s.id = a.stage_id
   AND s.journey_map_id = a.journey_map_id
   AND s.business_id = a.business_id
  WHERE s.id IS NULL;
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Legacy journey actions with invalid business/stage/map ownership: %', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM public.workflow_runs r
  LEFT JOIN public.automation_workflows w
    ON w.id = r.workflow_id AND w.business_id = r.business_id
  WHERE w.id IS NULL;
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Legacy workflow runs with invalid business/workflow ownership: %', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM public.workflow_step_logs s
  LEFT JOIN public.workflow_runs r
    ON r.id = s.run_id AND r.business_id = s.business_id
  LEFT JOIN public.automation_workflows w
    ON w.id = s.workflow_id AND w.business_id = s.business_id
  WHERE r.id IS NULL OR w.id IS NULL OR r.workflow_id <> s.workflow_id;
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Legacy workflow steps with invalid run/workflow/business ownership: %', invalid_count;
  END IF;
END $$;

DROP POLICY IF EXISTS "Allow access to business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can access their business" ON public.businesses;
CREATE POLICY "Owners can access their business"
  ON public.businesses FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Allow access to crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Owners can manage CRM contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Owners can view CRM contacts" ON public.crm_contacts;
CREATE POLICY "Owners can view CRM contacts"
  ON public.crm_contacts FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.crm_contacts FROM anon, authenticated;
GRANT SELECT ON TABLE public.crm_contacts TO authenticated;

DROP POLICY IF EXISTS "Allow access to crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Owners can manage CRM activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Owners can view CRM activities" ON public.crm_activities;
CREATE POLICY "Owners can view CRM activities"
  ON public.crm_activities FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.crm_contacts c
      WHERE c.id = crm_activities.contact_id
        AND c.business_id = crm_activities.business_id
    )
  )
;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.crm_activities FROM anon, authenticated;
GRANT SELECT ON TABLE public.crm_activities TO authenticated;

DROP POLICY IF EXISTS "Owners can manage journey maps" ON public.customer_journey_maps;
CREATE POLICY "Owners can manage journey maps"
  ON public.customer_journey_maps FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage journey stages" ON public.journey_map_stages;
CREATE POLICY "Owners can manage journey stages"
  ON public.journey_map_stages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.customer_journey_maps m ON m.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND m.id = journey_map_stages.journey_map_id
        AND m.business_id = journey_map_stages.business_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.customer_journey_maps m ON m.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND m.id = journey_map_stages.journey_map_id
        AND m.business_id = journey_map_stages.business_id
    )
  );

DROP POLICY IF EXISTS "Owners can manage journey stage actions" ON public.journey_stage_actions;
CREATE POLICY "Owners can manage journey stage actions"
  ON public.journey_stage_actions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.journey_map_stages s ON s.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND s.id = journey_stage_actions.stage_id
        AND s.journey_map_id = journey_stage_actions.journey_map_id
        AND s.business_id = journey_stage_actions.business_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.journey_map_stages s ON s.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND s.id = journey_stage_actions.stage_id
        AND s.journey_map_id = journey_stage_actions.journey_map_id
        AND s.business_id = journey_stage_actions.business_id
    )
  );

-- -------------------------------------------------------------------------
-- 2.4 Direct-write and function-grant restrictions
-- -------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'business';

-- Existing audit history remains unchanged. New pre-business platform events
-- use NULL business_id and are intentionally excluded from owner queries.
ALTER TABLE public.audit_logs
  ALTER COLUMN business_id DROP NOT NULL,
  ALTER COLUMN scope SET DEFAULT 'business',
  ALTER COLUMN scope SET NOT NULL;

-- Audit history must prevent business deletion rather than cascade away. NULL
-- platform rows are still valid because foreign keys do not check NULL values.
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_business_id_fkey;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.businesses(id)
  ON DELETE RESTRICT
  NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.audit_logs'::regclass
      AND conname = 'audit_logs_scope_business_consistency_check'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_scope_business_consistency_check
      CHECK (
        (scope = 'business' AND business_id IS NOT NULL)
        OR (scope = 'platform' AND business_id IS NULL)
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Owners can insert audit logs for their business" ON public.audit_logs;
DROP POLICY IF EXISTS "Owners can view their business audit logs" ON public.audit_logs;
CREATE POLICY "Owners can view their business audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- Replace the earlier unscoped helper with the AuditService contract. Direct
-- table INSERT remains revoked for every application role; all authenticated
-- business audit writes cross this checked RPC seam.
DROP FUNCTION IF EXISTS public.record_audit_log_tx(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
);

CREATE OR REPLACE FUNCTION public.record_audit_log_tx(
  p_scope TEXT,
  p_business_id UUID,
  p_action TEXT,
  p_actor_id TEXT,
  p_actor_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_outcome TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_initiator_id TEXT DEFAULT NULL,
  p_initiator_type TEXT DEFAULT NULL,
  p_approver_id TEXT DEFAULT NULL,
  p_approver_type TEXT DEFAULT NULL,
  p_approved_at TIMESTAMPTZ DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_workflow_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_schema_version INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_log_id UUID;
  v_allowed_keys TEXT[];
  v_metadata JSONB;
  v_role TEXT := auth.role();
  v_is_owned_workflow_context BOOLEAN := false;
BEGIN
  IF p_scope <> 'business' OR p_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'BUSINESS_AUDIT_SCOPE_REQUIRED';
  END IF;

  IF p_action NOT IN ('auth.login', 'auth.logout', 'auth.signup', 'auth.failed_login', 'auth.password_reset', 'auth.session_revoked', 'business.created', 'business.updated', 'business.api_key_rotated', 'business.settings_changed', 'google.connected', 'google.reconnected', 'google.credentials_replaced', 'google.disconnected', 'crm.contact.created', 'crm.contact.updated', 'crm.contact.deleted', 'crm.contact.stage_changed', 'crm.activity.created', 'crm.activity.updated', 'crm.activity.deleted', 'billing.subscription.created', 'billing.subscription.updated', 'billing.subscription.cancelled', 'billing.invoice.paid', 'billing.payment_failed', 'website.created', 'website.updated', 'website.published', 'website.unpublished', 'website.deleted', 'marketing.campaign.created', 'marketing.campaign.updated', 'marketing.campaign.dispatched', 'marketing.campaign.paused', 'webinar.created', 'webinar.updated', 'webinar.scheduled', 'webinar.rescheduled', 'webinar.cancelled', 'webinar.deleted', 'webinar.completed', 'webinar.series.created', 'webinar.series.updated', 'webinar.series.deleted', 'webinar.registration.created', 'webinar.feedback.submitted', 'webinar.feedback.marketing_opt_in', 'webinar.attendance.import_started', 'webinar.attendance.import_completed', 'webinar.participant.reviewed', 'webinar.meet.provisioning_started', 'webinar.meet.provisioned', 'webinar.meet.provisioning_unknown', 'webinar.followup.updated', 'webinar.followup.scheduled', 'webinar.notification.queued', 'webinar.email.processing_started', 'webinar.email.provider_accepted', 'webinar.email.failed', 'webinar.email.needs_review', 'journey.map.created', 'journey.map.updated', 'journey.map.deleted', 'journey.stage.created', 'journey.stage.updated', 'journey.stage.deleted', 'journey.action.approved', 'journey.action.dismissed', 'ai.workflow.created', 'ai.workflow.updated', 'ai.workflow.deleted', 'ai.workflow.approved', 'ai.workflow.rejected', 'ai.workflow.executed', 'ai.workflow.failed', 'ai.workflow.step_succeeded', 'ai.workflow.step_failed', 'ai.workflow.step_simulated', 'ai.workflow.step_unsupported', 'security.unauthorized_access', 'security.rate_limited', 'security.tenant_violation', 'security.api_key_rotated') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'AUDIT_ACTION_NOT_ALLOWED';
  END IF;

  v_allowed_keys := CASE p_action
    WHEN 'auth.login' THEN ARRAY['provider', 'method', 'auth_method', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'auth.logout' THEN ARRAY['provider', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'auth.signup' THEN ARRAY['provider', 'method', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'auth.failed_login' THEN ARRAY['provider', 'method', 'identifier_type', 'reason_code', 'operation_id', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'auth.password_reset' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'auth.session_revoked' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'business.created' THEN ARRAY['business_name', 'provisioning_source', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'business.updated' THEN ARRAY['changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'business.api_key_rotated' THEN ARRAY['key_name', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'business.settings_changed' THEN ARRAY['changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'google.connected' THEN ARRAY['provider', 'scopes', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'google.reconnected' THEN ARRAY['provider', 'scopes', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'google.credentials_replaced' THEN ARRAY['provider', 'scopes', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'google.disconnected' THEN ARRAY['provider', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'crm.contact.created' THEN ARRAY['contact_id', 'source', 'stage', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'crm.contact.updated' THEN ARRAY['contact_id', 'changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'crm.contact.deleted' THEN ARRAY['contact_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'crm.contact.stage_changed' THEN ARRAY['contact_id', 'previous_stage', 'stage', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'crm.activity.created' THEN ARRAY['contact_id', 'activity_type', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'crm.activity.updated' THEN ARRAY['contact_id', 'activity_id', 'changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'crm.activity.deleted' THEN ARRAY['contact_id', 'activity_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'billing.subscription.created' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'billing.subscription.updated' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'billing.subscription.cancelled' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'billing.invoice.paid' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'billing.payment_failed' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'website.created' THEN ARRAY['website_id', 'website_title', 'slug', 'template_id', 'section_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'website.updated' THEN ARRAY['website_id', 'title', 'sections_count', 'changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'website.published' THEN ARRAY['website_id', 'website_title', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'website.unpublished' THEN ARRAY['website_id', 'website_title', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'website.deleted' THEN ARRAY['website_id', 'deleted_title', 'deleted_slug', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'marketing.campaign.created' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'marketing.campaign.updated' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'marketing.campaign.dispatched' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'marketing.campaign.paused' THEN ARRAY['operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.created' THEN ARRAY['webinar_id', 'session_count', 'status', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.updated' THEN ARRAY['webinar_id', 'changed_fields', 'version', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.scheduled' THEN ARRAY['webinar_id', 'version', 'recipient_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.rescheduled' THEN ARRAY['webinar_id', 'version', 'recipient_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.cancelled' THEN ARRAY['webinar_id', 'version', 'recipient_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.deleted' THEN ARRAY['webinar_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.completed' THEN ARRAY['webinar_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.series.created' THEN ARRAY['series_id', 'session_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.series.updated' THEN ARRAY['series_id', 'changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.series.deleted' THEN ARRAY['series_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.registration.created' THEN ARRAY['webinar_id', 'registration_id', 'session_count', 'source', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.feedback.submitted' THEN ARRAY['webinar_id', 'registration_id', 'rating', 'was_useful', 'product_interest', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.feedback.marketing_opt_in' THEN ARRAY['webinar_id', 'registration_id', 'consent', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.attendance.import_started' THEN ARRAY['webinar_id', 'import_id', 'page_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.attendance.import_completed' THEN ARRAY['webinar_id', 'import_id', 'participant_count', 'unresolved_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.participant.reviewed' THEN ARRAY['webinar_id', 'participant_id', 'review_disposition', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.meet.provisioning_started' THEN ARRAY['webinar_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.meet.provisioned' THEN ARRAY['webinar_id', 'operation_id', 'provider', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.meet.provisioning_unknown' THEN ARRAY['webinar_id', 'operation_id', 'provider', 'reason_code', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'webinar.followup.updated' THEN ARRAY['webinar_id', 'enabled', 'version', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.followup.scheduled' THEN ARRAY['webinar_id', 'version', 'recipient_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.notification.queued' THEN ARRAY['webinar_id', 'operation_id', 'recipient_count', 'notification_type', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.email.processing_started' THEN ARRAY['webinar_id', 'operation_id', 'job_count', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.email.provider_accepted' THEN ARRAY['webinar_id', 'operation_id', 'job_id', 'provider', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.email.failed' THEN ARRAY['webinar_id', 'operation_id', 'job_id', 'provider', 'reason_code', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'webinar.email.needs_review' THEN ARRAY['webinar_id', 'operation_id', 'job_id', 'provider', 'reason_code', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'journey.map.created' THEN ARRAY['journey_map_id', 'stage_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'journey.map.updated' THEN ARRAY['journey_map_id', 'changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'journey.map.deleted' THEN ARRAY['journey_map_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'journey.stage.created' THEN ARRAY['journey_map_id', 'stage_id', 'order_index', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'journey.stage.updated' THEN ARRAY['journey_map_id', 'stage_id', 'changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'journey.stage.deleted' THEN ARRAY['journey_map_id', 'stage_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'journey.action.approved' THEN ARRAY['journey_map_id', 'action_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'journey.action.dismissed' THEN ARRAY['journey_map_id', 'action_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.created' THEN ARRAY['workflow_id', 'node_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.updated' THEN ARRAY['workflow_id', 'changed_fields', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.deleted' THEN ARRAY['workflow_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.approved' THEN ARRAY['workflow_id', 'run_id', 'node_id', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.rejected' THEN ARRAY['workflow_id', 'run_id', 'node_id', 'reason_code', 'operation_id', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'ai.workflow.executed' THEN ARRAY['workflow_id', 'run_id', 'node_count', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.failed' THEN ARRAY['workflow_id', 'run_id', 'node_id', 'reason_code', 'operation_id', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'ai.workflow.step_succeeded' THEN ARRAY['workflow_id', 'run_id', 'node_id', 'capability', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.step_failed' THEN ARRAY['workflow_id', 'run_id', 'node_id', 'capability', 'reason_code', 'operation_id', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'ai.workflow.step_simulated' THEN ARRAY['workflow_id', 'run_id', 'node_id', 'capability', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'ai.workflow.step_unsupported' THEN ARRAY['workflow_id', 'run_id', 'node_id', 'capability', 'reason_code', 'operation_id', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'security.unauthorized_access' THEN ARRAY['route', 'method', 'reason_code', 'operation_id', 'request_id', 'correlation_id', 'result']::TEXT[]
    WHEN 'security.rate_limited' THEN ARRAY['route', 'method', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'security.tenant_violation' THEN ARRAY['route', 'method', 'resource_type', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'security.api_key_rotated' THEN ARRAY['key_name', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    ELSE ARRAY[]::TEXT[] END;

  IF v_role = 'authenticated' AND NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'BUSINESS_AUDIT_NOT_OWNED';
  END IF;

  IF v_role = 'authenticated' THEN
    IF p_actor_type NOT IN ('user', 'ai_agent') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVALID_AUTHENTICATED_AUDIT_ACTOR';
    END IF;

    IF p_actor_type = 'user' AND p_actor_id IS DISTINCT FROM auth.uid()::TEXT THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUDIT_ACTOR_MUST_MATCH_AUTH_USER';
    END IF;

    IF p_initiator_type = 'user' AND p_initiator_id IS DISTINCT FROM auth.uid()::TEXT THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUDIT_INITIATOR_MUST_MATCH_AUTH_USER';
    END IF;

    IF p_approver_type = 'user' AND p_approver_id IS DISTINCT FROM auth.uid()::TEXT THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUDIT_APPROVER_MUST_MATCH_AUTH_USER';
    END IF;

    IF p_actor_type = 'ai_agent'
       OR p_initiator_type = 'ai_agent'
       OR p_approver_type = 'ai_agent'
       OR p_workflow_id IS NOT NULL THEN
      IF p_workflow_id IS NULL OR p_workflow_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'OWNED_WORKFLOW_CONTEXT_REQUIRED';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.workflow_runs r
        JOIN public.automation_workflows w
          ON w.id = r.workflow_id AND w.business_id = r.business_id
        WHERE r.business_id = p_business_id
          AND (r.id::TEXT = p_workflow_id OR r.workflow_id::TEXT = p_workflow_id)
      ) INTO v_is_owned_workflow_context;

      IF NOT v_is_owned_workflow_context THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_CONTEXT_NOT_OWNED';
      END IF;

      IF p_approver_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.workflow_runs r
        WHERE r.business_id = p_business_id
          AND (r.id::TEXT = p_workflow_id OR r.workflow_id::TEXT = p_workflow_id)
          AND (r.approved_by IS NULL OR r.approved_by::TEXT = p_approver_id)
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_APPROVER_NOT_VERIFIED';
      END IF;
    END IF;
  ELSIF v_role = 'service_role' THEN
    IF p_actor_type = 'integration' AND p_actor_id = 'webinar_public' THEN
      IF p_action NOT IN (
        'webinar.registration.created',
        'webinar.notification.queued',
        'webinar.feedback.submitted',
        'webinar.feedback.marketing_opt_in'
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVICE_AUDIT_ACTION_NOT_ALLOWED';
      END IF;
    ELSIF p_actor_type = 'system' AND p_actor_id = 'webinar.manual-worker' THEN
      IF p_action NOT IN (
        'webinar.email.processing_started',
        'webinar.email.provider_accepted',
        'webinar.email.failed',
        'webinar.email.needs_review'
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVICE_AUDIT_ACTION_NOT_ALLOWED';
      END IF;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVICE_AUDIT_INTEGRATION_NOT_ALLOWED';
    END IF;

    IF p_resource_id IS NULL OR p_resource_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WEBINAR_AUDIT_RESOURCE_ID_INVALID';
    END IF;

    IF p_actor_id = 'webinar.manual-worker' THEN
      IF p_action = 'webinar.email.processing_started' THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.webinar_email_outbox
          WHERE business_id = p_business_id
            AND webinar_id = p_resource_id::UUID
            AND status = 'processing'
        ) THEN
          RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBINAR_WORKER_BATCH_NOT_OWNED';
        END IF;
      ELSE
        IF COALESCE(p_metadata->>'webinar_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
           OR NOT EXISTS (
             SELECT 1 FROM public.webinar_email_outbox
             WHERE business_id = p_business_id
               AND id = p_resource_id::UUID
               AND webinar_id = (p_metadata->>'webinar_id')::UUID
           ) THEN
          RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBINAR_WORKER_JOB_NOT_OWNED';
        END IF;
      END IF;
    END IF;

    IF p_action IN ('webinar.registration.created', 'webinar.notification.queued') AND NOT EXISTS (
      SELECT 1 FROM public.webinar_registrations
      WHERE id = p_resource_id::UUID AND business_id = p_business_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBINAR_REGISTRATION_NOT_OWNED';
    END IF;

    IF p_action IN ('webinar.feedback.submitted', 'webinar.feedback.marketing_opt_in')
       AND NOT EXISTS (
         SELECT 1 FROM public.webinar_feedback
         WHERE id = p_resource_id::UUID AND business_id = p_business_id
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBINAR_FEEDBACK_NOT_OWNED';
    END IF;

    IF p_initiator_id IS NOT NULL OR p_initiator_type IS NOT NULL
       OR p_approver_id IS NOT NULL OR p_approver_type IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVICE_AUDIT_ACTOR_CONTEXT_INVALID';
    END IF;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUDIT_RPC_ROLE_NOT_ALLOWED';
  END IF;

  IF p_outcome NOT IN ('success', 'failure')
     OR p_actor_type NOT IN ('user', 'ai_agent', 'system', 'integration')
     OR (p_initiator_type IS NOT NULL AND p_initiator_type NOT IN ('user', 'ai_agent', 'system', 'integration'))
     OR (p_approver_type IS NOT NULL AND p_approver_type NOT IN ('user', 'ai_agent', 'system', 'integration')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'AUDIT_ARGUMENTS_INVALID';
  END IF;

  IF jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'AUDIT_METADATA_OBJECT_REQUIRED';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key,
    CASE jsonb_typeof(value)
      WHEN 'string' THEN to_jsonb(left(trim(value #>> '{}'), 256))
      ELSE value
    END
  ), '{}'::jsonb) INTO v_metadata
  FROM jsonb_each(COALESCE(p_metadata, '{}'::jsonb))
  WHERE key = ANY(v_allowed_keys)
    AND jsonb_typeof(value) IN ('string', 'number', 'boolean', 'array')
    AND (jsonb_typeof(value) <> 'array' OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(value) AS array_item(element)
      WHERE jsonb_typeof(array_item.element) NOT IN ('string', 'number', 'boolean')
    ));

  INSERT INTO public.audit_logs (
    scope,
    business_id,
    action,
    actor_id,
    actor_type,
    initiator_id,
    initiator_type,
    approver_id,
    approver_type,
    approved_at,
    resource_type,
    resource_id,
    outcome,
    error_code,
    error_message,
    correlation_id,
    workflow_id,
    request_id,
    metadata,
    schema_version
  ) VALUES (
    'business',
    p_business_id,
    p_action,
    p_actor_id,
    p_actor_type,
    p_initiator_id,
    p_initiator_type,
    p_approver_id,
    p_approver_type,
    p_approved_at,
    p_resource_type,
    p_resource_id,
    p_outcome,
    p_error_code,
    p_error_message,
    p_correlation_id,
    p_workflow_id,
    p_request_id,
    v_metadata,
    p_schema_version
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_audit_log_tx(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_audit_log_tx(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) TO authenticated, service_role;

-- CRM writes cross these owner-derived transaction seams. The functions do
-- not accept business_id; they derive the single business from auth.uid(),
-- write the CRM rows, and insert the required audit rows before returning.
-- Any audit failure aborts the surrounding RPC transaction.
CREATE OR REPLACE FUNCTION public.crm_create_contact_with_audit(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_company TEXT,
  p_stage TEXT,
  p_value INTEGER,
  p_source TEXT,
  p_tags TEXT[],
  p_next_action_text TEXT,
  p_next_action_due_at TIMESTAMPTZ,
  p_last_activity_at TIMESTAMPTZ,
  p_updated_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_contact public.crm_contacts;
  v_activity_id UUID;
  v_activity_type TEXT;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CRM_BUSINESS_NOT_FOUND';
  END IF;

  IF NULLIF(trim(p_first_name), '') IS NULL
     OR NULLIF(trim(p_last_name), '') IS NULL
     OR NULLIF(trim(p_email), '') IS NULL
     OR p_stage IS NULL
     OR p_stage NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned')
     OR p_source IS NULL
     OR p_source NOT IN ('website_form', 'webinar', 'manual', 'referral')
     OR p_value IS NULL OR p_value < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_INPUT_INVALID';
  END IF;

  INSERT INTO public.crm_contacts (
    business_id, first_name, last_name, email, phone, company, stage, status,
    value, source, tags, next_action_text, next_action_due_at,
    last_activity_at, updated_at
  ) VALUES (
    v_business_id,
    trim(p_first_name),
    trim(p_last_name),
    lower(trim(p_email)),
    NULLIF(trim(p_phone), ''),
    NULLIF(trim(p_company), ''),
    p_stage,
    p_stage,
    p_value,
    p_source,
    COALESCE(p_tags, '{}'::TEXT[]),
    NULLIF(trim(p_next_action_text), ''),
    p_next_action_due_at,
    COALESCE(p_last_activity_at, NOW()),
    COALESCE(p_updated_at, NOW())
  )
  RETURNING * INTO v_contact;

  v_activity_type := CASE WHEN p_source = 'website_form' THEN 'form_submission' ELSE 'note' END;
  INSERT INTO public.crm_activities (
    business_id, contact_id, type, title, description, actor, metadata
  ) VALUES (
    v_business_id,
    v_contact.id,
    v_activity_type,
    CASE WHEN p_source = 'website_form' THEN 'Website Lead Captured' ELSE 'Contact Created' END,
    'Lead created via ' || p_source,
    'owner',
    '{}'::JSONB
  )
  RETURNING id INTO v_activity_id;

  PERFORM public.record_audit_log_tx(
    'business', v_business_id, 'crm.contact.created', auth.uid()::TEXT, 'user',
    'crm_contact', v_contact.id::TEXT, 'success',
    jsonb_build_object('contact_id', v_contact.id::TEXT, 'source', p_source, 'stage', p_stage)
  );
  PERFORM public.record_audit_log_tx(
    'business', v_business_id, 'crm.activity.created', auth.uid()::TEXT, 'user',
    'crm_activity', v_activity_id::TEXT, 'success',
    jsonb_build_object('contact_id', v_contact.id::TEXT, 'activity_type', v_activity_type)
  );

  RETURN to_jsonb(v_contact);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_update_contact_with_audit(
  p_contact_id UUID,
  p_patch JSONB,
  p_now TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_before public.crm_contacts;
  v_after public.crm_contacts;
  v_activity_id UUID;
  v_stage_changed BOOLEAN;
  v_changed_fields TEXT[];
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CRM_BUSINESS_NOT_FOUND';
  END IF;
  IF jsonb_typeof(COALESCE(p_patch, '{}'::JSONB)) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_PATCH_INVALID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_patch) AS key
    WHERE key NOT IN (
      'first_name', 'last_name', 'email', 'phone', 'company', 'stage', 'value',
      'source', 'tags', 'next_action_text', 'next_action_due_at'
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_PATCH_FIELD_NOT_ALLOWED';
  END IF;
  IF (p_patch ? 'email') AND NULLIF(trim(p_patch->>'email'), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_EMAIL_REQUIRED';
  END IF;
  IF (p_patch ? 'stage') AND (
    jsonb_typeof(p_patch->'stage') IS DISTINCT FROM 'string'
    OR p_patch->>'stage' NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_STAGE_INVALID';
  END IF;
  IF (p_patch ? 'source') AND (
    jsonb_typeof(p_patch->'source') IS DISTINCT FROM 'string'
    OR p_patch->>'source' NOT IN ('website_form', 'webinar', 'manual', 'referral')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_SOURCE_INVALID';
  END IF;
  IF (p_patch ? 'value') AND (
    jsonb_typeof(p_patch->'value') IS DISTINCT FROM 'number'
    OR (p_patch->>'value') !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_VALUE_INVALID';
  END IF;
  IF p_patch ? 'tags' AND (
    jsonb_typeof(p_patch->'tags') IS DISTINCT FROM 'array'
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_patch->'tags') AS item
      WHERE jsonb_typeof(item) <> 'string'
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_TAGS_INVALID';
  END IF;

  SELECT * INTO v_before
  FROM public.crm_contacts
  WHERE id = p_contact_id AND business_id = v_business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_stage_changed := (p_patch ? 'stage') AND (p_patch->>'stage') IS DISTINCT FROM v_before.stage;
  v_changed_fields := ARRAY(SELECT jsonb_object_keys(p_patch));

  UPDATE public.crm_contacts
  SET first_name = CASE WHEN p_patch ? 'first_name' THEN NULLIF(trim(p_patch->>'first_name'), '') ELSE first_name END,
      last_name = CASE WHEN p_patch ? 'last_name' THEN NULLIF(trim(p_patch->>'last_name'), '') ELSE last_name END,
      email = CASE WHEN p_patch ? 'email' THEN lower(trim(p_patch->>'email')) ELSE email END,
      phone = CASE WHEN p_patch ? 'phone' THEN NULLIF(trim(p_patch->>'phone'), '') ELSE phone END,
      company = CASE WHEN p_patch ? 'company' THEN NULLIF(trim(p_patch->>'company'), '') ELSE company END,
      stage = CASE WHEN p_patch ? 'stage' THEN p_patch->>'stage' ELSE stage END,
      status = CASE WHEN p_patch ? 'stage' THEN p_patch->>'stage' ELSE status END,
      value = CASE WHEN p_patch ? 'value' THEN (p_patch->>'value')::INTEGER ELSE value END,
      source = CASE WHEN p_patch ? 'source' THEN p_patch->>'source' ELSE source END,
      tags = CASE WHEN p_patch ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'tags')) ELSE tags END,
      next_action_text = CASE WHEN p_patch ? 'next_action_text' THEN NULLIF(trim(p_patch->>'next_action_text'), '') ELSE next_action_text END,
      next_action_due_at = CASE WHEN p_patch ? 'next_action_due_at' THEN (p_patch->>'next_action_due_at')::TIMESTAMPTZ ELSE next_action_due_at END,
      last_activity_at = COALESCE(p_now, NOW()),
      updated_at = COALESCE(p_now, NOW())
  WHERE id = p_contact_id AND business_id = v_business_id
  RETURNING * INTO v_after;

  IF v_stage_changed THEN
    INSERT INTO public.crm_activities (
      business_id, contact_id, type, title, description, actor, metadata
    ) VALUES (
      v_business_id,
      v_after.id,
      'stage_change',
      'Stage moved to ' || v_after.stage,
      'Stage changed from ' || v_before.stage || ' to ' || v_after.stage,
      'owner',
      jsonb_build_object('previous_stage', v_before.stage, 'new_stage', v_after.stage)
    )
    RETURNING id INTO v_activity_id;
  END IF;

  IF v_stage_changed THEN
    PERFORM public.record_audit_log_tx(
      'business', v_business_id, 'crm.activity.created', auth.uid()::TEXT, 'user',
      'crm_activity', v_activity_id::TEXT, 'success',
      jsonb_build_object('contact_id', v_after.id::TEXT, 'activity_type', 'stage_change')
    );
  END IF;
  PERFORM public.record_audit_log_tx(
    'business', v_business_id,
    CASE WHEN v_stage_changed THEN 'crm.contact.stage_changed' ELSE 'crm.contact.updated' END,
    auth.uid()::TEXT, 'user', 'crm_contact', v_after.id::TEXT, 'success',
    CASE WHEN v_stage_changed
      THEN jsonb_build_object('contact_id', v_after.id::TEXT, 'previous_stage', v_before.stage, 'stage', v_after.stage)
      ELSE jsonb_build_object('contact_id', v_after.id::TEXT, 'changed_fields', to_jsonb(v_changed_fields))
    END
  );

  RETURN to_jsonb(v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_delete_contact_with_audit(
  p_contact_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_contact_id UUID;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CRM_BUSINESS_NOT_FOUND';
  END IF;
  SELECT id INTO v_contact_id
  FROM public.crm_contacts
  WHERE id = p_contact_id AND business_id = v_business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  /* The row lock above makes the audit and delete one transaction boundary. */

  PERFORM public.record_audit_log_tx(
    'business', v_business_id, 'crm.contact.deleted', auth.uid()::TEXT, 'user',
    'crm_contact', p_contact_id::TEXT, 'success',
    jsonb_build_object('contact_id', p_contact_id::TEXT)
  );
  DELETE FROM public.crm_contacts
  WHERE id = p_contact_id AND business_id = v_business_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_create_activity_with_audit(
  p_contact_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_actor TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_contact_exists BOOLEAN;
  v_activity public.crm_activities;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CRM_BUSINESS_NOT_FOUND';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.crm_contacts
    WHERE id = p_contact_id AND business_id = v_business_id
  ) INTO v_contact_exists;
  IF NOT v_contact_exists THEN
    RETURN NULL;
  END IF;
  IF p_type NOT IN ('form_submission', 'stage_change', 'note', 'email_sent', 'ai_agent_action')
     OR p_actor NOT IN ('owner', 'system', 'ai_agent')
     OR NULLIF(trim(p_title), '') IS NULL
     OR jsonb_typeof(COALESCE(p_metadata, '{}'::JSONB)) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_INPUT_INVALID';
  END IF;

  INSERT INTO public.crm_activities (
    business_id, contact_id, type, title, description, actor, metadata
  ) VALUES (
    v_business_id,
    p_contact_id,
    p_type,
    trim(p_title),
    NULLIF(trim(p_description), ''),
    p_actor,
    COALESCE(p_metadata, '{}'::JSONB)
  )
  RETURNING * INTO v_activity;

  PERFORM public.record_audit_log_tx(
    'business', v_business_id, 'crm.activity.created', auth.uid()::TEXT, 'user',
    'crm_activity', v_activity.id::TEXT, 'success',
    jsonb_build_object('contact_id', p_contact_id::TEXT, 'activity_type', p_type)
  );

  RETURN to_jsonb(v_activity);
END;
$$;

REVOKE ALL ON FUNCTION public.crm_create_contact_with_audit(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[], TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.crm_update_contact_with_audit(UUID, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.crm_delete_contact_with_audit(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.crm_create_activity_with_audit(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_create_contact_with_audit(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[], TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_update_contact_with_audit(UUID, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_delete_contact_with_audit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_create_activity_with_audit(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Restricted pre-business security events. The business reference and
-- attribution are fixed in the function body, rather than accepted from the
-- caller. auth.signup failures use this path before provisioning. Successful
-- signup events are written later with the verified owner's business_id by the
-- application AuditService.
CREATE OR REPLACE FUNCTION public.record_platform_security_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
  v_metadata JSONB;
BEGIN
  IF p_action NOT IN (
    'auth.failed_login',
    'auth.signup',
    'security.unauthorized_access',
    'security.rate_limited'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'INVALID_PLATFORM_SECURITY_ACTION';
  END IF;

  -- Closed metadata allowlist. String values are trimmed and bounded; nested
  -- objects, arrays, arbitrary prompts, tokens, request bodies, and unknown
  -- keys are dropped before the immutable audit row is written.
  SELECT COALESCE(jsonb_object_agg(key,
    CASE jsonb_typeof(value)
      WHEN 'string' THEN to_jsonb(left(trim(value #>> '{}'), 256))
      WHEN 'number' THEN value
      WHEN 'boolean' THEN value
      ELSE NULL
    END
  ), '{}'::jsonb)
  INTO v_metadata
  FROM jsonb_each(CASE
    WHEN jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) = 'object'
      THEN COALESCE(p_metadata, '{}'::jsonb)
    ELSE '{}'::jsonb
  END)
  WHERE key IN (
    'request_id', 'correlation_id', 'provider', 'method', 'identifier_type',
    'reason_code', 'ip_hash', 'user_agent_family', 'endpoint', 'attempt_count'
  )
  AND jsonb_typeof(value) IN ('string', 'number', 'boolean');

  INSERT INTO public.audit_logs (
    scope,
    business_id,
    action,
    actor_id,
    actor_type,
    resource_type,
    resource_id,
    outcome,
    metadata
  ) VALUES (
    'platform',
    NULL,
    p_action,
    'supabase_auth',
    'integration',
    COALESCE(NULLIF(left(trim(p_resource_type), 120), ''), 'platform_security'),
    COALESCE(NULLIF(left(trim(p_resource_id), 240), ''), 'unknown'),
    'failure',
    v_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_platform_security_event(TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_platform_security_event(TEXT, TEXT, TEXT, JSONB)
  TO service_role;

DROP POLICY IF EXISTS "Owners can view and control workflow runs" ON public.workflow_runs;
CREATE POLICY "Owners can read owned workflow runs"
  ON public.workflow_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.automation_workflows w ON w.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND w.id = workflow_runs.workflow_id
        AND w.business_id = workflow_runs.business_id
    )
  );

DROP POLICY IF EXISTS "Owners can read step telemetry" ON public.workflow_step_logs;
CREATE POLICY "Owners can read owned step telemetry"
  ON public.workflow_step_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.workflow_runs r ON r.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND r.id = workflow_step_logs.run_id
        AND r.business_id = workflow_step_logs.business_id
        AND r.workflow_id = workflow_step_logs.workflow_id
    )
  );

REVOKE ALL ON TABLE public.workflow_runs, public.workflow_step_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.workflow_runs, public.workflow_step_logs TO authenticated;

-- Approval decisions and step/run state are written by checked server paths
-- using the service role until the application RPC layer is completed.
-- This migration supplies the checked audit insertion seam and removes raw
-- table writes. It does not claim atomic domain mutation coverage: operation-
-- specific RPCs/triggers are still required for CRM contact/activity changes,
-- journey map/stage/action changes, workflow definition/run/approval changes,
-- and public webinar registration/feedback transactions. The exact gaps are
-- reported with the migration handoff rather than hidden behind a generic
-- SQL dispatcher.
DROP POLICY IF EXISTS "Owners can manage journey stage actions" ON public.journey_stage_actions;
CREATE POLICY "Owners can manage journey stage actions"
  ON public.journey_stage_actions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.journey_map_stages s ON s.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND s.id = journey_stage_actions.stage_id
        AND s.journey_map_id = journey_stage_actions.journey_map_id
        AND s.business_id = journey_stage_actions.business_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.journey_map_stages s ON s.business_id = b.id
      WHERE b.owner_id = auth.uid()
        AND s.id = journey_stage_actions.stage_id
        AND s.journey_map_id = journey_stage_actions.journey_map_id
        AND s.business_id = journey_stage_actions.business_id
    )
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.journey_stage_actions TO authenticated;

DO $$
DECLARE
  signature TEXT;
  grant_role TEXT;
BEGIN
  -- Existing public RPCs keep their product authority, but no implicit PUBLIC
  -- execute privilege remains and every callable SECURITY DEFINER routine gets
  -- a fixed search path.
  FOREACH signature IN ARRAY ARRAY[
    'public.record_audit_log_tx(text,uuid,text,text,text,text,text,text,jsonb,text,text,text,text,timestamptz,text,text,text,text,text,integer)',
    'public.get_public_webinar_registration_form(text)',
    'public.register_public_webinar_attendee(text,text,text,text[],boolean)',
    'public.get_public_webinar_feedback_form(text)',
    'public.submit_public_webinar_feedback(text,integer,boolean,text,boolean,boolean)',
    'public.take_webinar_registration_rate_limit(text,integer,integer)',
    'public.webinar_series_delete_counts(uuid)',
    'public.delete_webinar_series(uuid,jsonb)',
    'public.enqueue_webinar_email(uuid,uuid,text,text,text,text,text,text,text,text,jsonb,timestamptz,integer)',
    'public.claim_webinar_email_jobs(text,integer,integer)',
    'public.mark_webinar_email_provider_accepted(uuid,text,text)',
    'public.mark_webinar_email_failed(uuid,text,text,boolean)',
    'public.mark_webinar_email_unknown(uuid,text,text)',
    'public.validate_webinar_followup_email(uuid)',
    'public.mark_webinar_email_blocked(uuid,text)',
    'public.claim_webinar_email_jobs_for_business(uuid,text,integer,integer)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = pg_catalog, public',
        to_regprocedure(signature)
      );
    END IF;
  END LOOP;

  -- Worker RPCs are server-only. record_audit_log_tx has its own checked
  -- authenticated/service_role grants above; public registration/feedback and
  -- owner series deletion retain their explicit grants.
  FOREACH signature IN ARRAY ARRAY[
    'public.enqueue_webinar_email(uuid,uuid,text,text,text,text,text,text,text,text,jsonb,timestamptz,integer)',
    'public.claim_webinar_email_jobs(text,integer,integer)',
    'public.mark_webinar_email_provider_accepted(uuid,text,text)',
    'public.mark_webinar_email_failed(uuid,text,text,boolean)',
    'public.mark_webinar_email_unknown(uuid,text,text)',
    'public.validate_webinar_followup_email(uuid)',
    'public.mark_webinar_email_blocked(uuid,text)',
    'public.claim_webinar_email_jobs_for_business(uuid,text,integer,integer)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', to_regprocedure(signature));
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', to_regprocedure(signature));
    END IF;
  END LOOP;

  FOREACH signature IN ARRAY ARRAY[
    'public.get_public_webinar_registration_form(text)',
    'public.register_public_webinar_attendee(text,text,text,text[],boolean)',
    'public.get_public_webinar_feedback_form(text)',
    'public.submit_public_webinar_feedback(text,integer,boolean,text,boolean,boolean)',
    'public.take_webinar_registration_rate_limit(text,integer,integer)',
    'public.webinar_series_delete_counts(uuid)',
    'public.delete_webinar_series(uuid,jsonb)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', to_regprocedure(signature));
    END IF;
  END LOOP;
END $$;

OMMIT;
