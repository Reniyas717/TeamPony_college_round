-- Route ordinary application audit writes through the existing strict owner /
-- service-role validator without consulting the public webinar context marker.
CREATE OR REPLACE FUNCTION public.record_owner_audit_log_tx(
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
LANGUAGE SQL
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.nexus_record_audit_log_tx_legacy(
    p_scope, p_business_id, p_action, p_actor_id, p_actor_type,
    p_resource_type, p_resource_id, p_outcome, p_metadata,
    p_initiator_id, p_initiator_type, p_approver_id, p_approver_type,
    p_approved_at, p_error_code, p_error_message, p_correlation_id,
    p_workflow_id, p_request_id, p_schema_version
  );
$$;

REVOKE ALL ON FUNCTION public.record_owner_audit_log_tx(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_owner_audit_log_tx(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) TO authenticated, service_role;
