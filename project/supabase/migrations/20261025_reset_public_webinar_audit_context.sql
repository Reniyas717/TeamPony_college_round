-- Keep the public webinar audit marker scoped to one audit call.
-- This preserves the strict public context checks in record_audit_log_tx while
-- preventing later audit events in the same transaction from inheriting it.
CREATE OR REPLACE FUNCTION public.nexus_record_public_webinar_audit(
  p_business_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  PERFORM set_config('nexus.public_webinar_audit', '1', true);

  BEGIN
    v_log_id := public.record_audit_log_tx(
      'business', p_business_id, p_action, 'webinar_public', 'integration',
      p_resource_type, p_resource_id::TEXT, 'success', COALESCE(p_metadata, '{}'::jsonb),
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('nexus.public_webinar_audit', '0', true);
    RAISE;
  END;

  PERFORM set_config('nexus.public_webinar_audit', '0', true);
  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.nexus_record_public_webinar_audit(UUID, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
