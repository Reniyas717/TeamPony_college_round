-- ====================================================================
-- Migration: 20261010_audit_logs_schema.sql
-- Description: Central audit logging schema for security and business state
--              changes with tenant isolation and append-only immutability.
-- Reference: AGENTS.md §4 (Single-Tenant Model) & Central Audit Architecture
-- ====================================================================

-- 1. Create Central Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Action classification
  action TEXT NOT NULL,
  
  -- Actor details (who executed the operation)
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'ai_agent', 'system', 'integration')),
  
  -- Originator / Initiator details (who requested or initiated the operation)
  initiator_id TEXT,
  initiator_type TEXT CHECK (initiator_type IN ('user', 'ai_agent', 'system', 'integration')),
  
  -- Approver details (for high-consequence operations requiring human/system sign-off)
  approver_id TEXT,
  approver_type TEXT CHECK (approver_type IN ('user', 'ai_agent', 'system', 'integration')),
  approved_at TIMESTAMPTZ,
  
  -- Target Resource
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  
  -- Outcome and Error Details
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  error_code TEXT,
  error_message TEXT,
  
  -- Distributed Tracing and Correlation Identifiers
  correlation_id TEXT,
  workflow_id TEXT,
  request_id TEXT,
  
  -- Sanitized, Allowlisted Metadata (Never contains credentials, raw prompts, or card data)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Server creation timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance Indices for Query Patterns & Tenant Scoping
CREATE INDEX IF NOT EXISTS idx_audit_logs_biz_timestamp 
  ON public.audit_logs(business_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_biz_action 
  ON public.audit_logs(business_id, action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_biz_actor 
  ON public.audit_logs(business_id, actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_biz_resource 
  ON public.audit_logs(business_id, resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_biz_outcome 
  ON public.audit_logs(business_id, outcome);

CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation 
  ON public.audit_logs(correlation_id) 
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_workflow 
  ON public.audit_logs(workflow_id) 
  WHERE workflow_id IS NOT NULL;

-- 3. Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Business owners can only view audit logs belonging to their business
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Owners can view their business audit logs'
  ) THEN
    CREATE POLICY "Owners can view their business audit logs"
      ON public.audit_logs FOR SELECT
      TO authenticated
      USING (
        business_id IN (
          SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERT: Authenticated users can insert audit logs for their verified business
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Owners can insert audit logs for their business'
  ) THEN
    CREATE POLICY "Owners can insert audit logs for their business"
      ON public.audit_logs FOR INSERT
      TO authenticated
      WITH CHECK (
        business_id IN (
          SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- NOTE: No UPDATE or DELETE policies are created for authenticated users.
-- RLS default-denies all UPDATE and DELETE operations for regular application roles.

-- 4. Database-Enforced Append-Only Immutability Protections
-- Prevents UPDATE or DELETE on historical audit records at the database engine level.
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only. Modification or deletion of audit records is strictly prohibited.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 5. Atomic In-Database Transaction Helper
-- Allows stored procedures, RPCs, or database triggers to atomically emit an audit record
-- within the exact same database transaction as the business mutation.
CREATE OR REPLACE FUNCTION public.record_audit_log_tx(
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
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
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
    p_metadata,
    p_schema_version
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
