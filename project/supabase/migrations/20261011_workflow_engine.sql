-- ====================================================================
-- Migration: 20261011_workflow_engine.sql
-- Description: NL-to-Executable Workflow Engine schema with DAG definitions,
--              execution instances, and idempotent step-level audit telemetry.
-- Reference: NL_WORKFLOW_ENGINE_SPEC.md & AGENTS.md §4, §8, §9
-- ====================================================================

-- 1. WORKFLOW DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  natural_language_prompt TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT' NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
  dag_definition JSONB NOT NULL,
  is_high_impact BOOLEAN DEFAULT false NOT NULL,
  execution_count INTEGER DEFAULT 0 NOT NULL,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflows_business ON public.automation_workflows(business_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.automation_workflows(business_id, status);

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage workflows" ON public.automation_workflows;
CREATE POLICY "Owners can manage workflows"
  ON public.automation_workflows FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- 2. WORKFLOW RUNS (INSTANCES)
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  trigger_event_id TEXT,
  status TEXT DEFAULT 'RUNNING' NOT NULL CHECK (status IN ('RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED')),
  current_node_id TEXT,
  context_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON public.workflow_runs(business_id, status);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view and control workflow runs" ON public.workflow_runs;
CREATE POLICY "Owners can view and control workflow runs"
  ON public.workflow_runs FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- 3. STEP EXECUTION AUDIT TELEMETRY
CREATE TABLE IF NOT EXISTS public.workflow_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  capability TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'EXECUTING', 'SUCCESS', 'FAILED', 'SKIPPED', 'PAUSED_FOR_APPROVAL')),
  idempotency_key TEXT UNIQUE NOT NULL,
  input_payload JSONB DEFAULT '{}'::jsonb,
  output_payload JSONB DEFAULT '{}'::jsonb,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  execution_duration_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_step_logs_run ON public.workflow_step_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_step_logs_idempotency ON public.workflow_step_logs(idempotency_key);

ALTER TABLE public.workflow_step_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read step telemetry" ON public.workflow_step_logs;
CREATE POLICY "Owners can read step telemetry"
  ON public.workflow_step_logs FOR SELECT
  TO authenticated
  USING (workflow_id IN (
    SELECT id FROM public.automation_workflows WHERE business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  ));
