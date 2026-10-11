-- Fix three-valued boolean logic in record_audit_log_tx
-- When nexus.public_webinar_audit is unset, current_setting(..., true) returns NULL.
-- In SQL, NULL = '1' is NULL, and NOT (NULL) is NULL, which causes IF NOT v_public_webinar THEN
-- to evaluate to false/not-taken, falling through into the public webinar branch and raising
-- PUBLIC_WEBINAR_AUDIT_CONTEXT_INVALID for all standard business operations (such as website creation).

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
  v_public_webinar BOOLEAN := COALESCE(current_setting('nexus.public_webinar_audit', true), '0') = '1';
  v_role TEXT := auth.role();
BEGIN
  IF NOT v_public_webinar THEN
    RETURN public.nexus_record_audit_log_tx_legacy(
      p_scope, p_business_id, p_action, p_actor_id, p_actor_type,
      p_resource_type, p_resource_id, p_outcome, p_metadata,
      p_initiator_id, p_initiator_type, p_approver_id, p_approver_type,
      p_approved_at, p_error_code, p_error_message, p_correlation_id,
      p_workflow_id, p_request_id, p_schema_version
    );
  END IF;

  IF v_role NOT IN ('anon', 'authenticated')
     OR p_scope <> 'business'
     OR p_business_id IS NULL
     OR p_action NOT IN (
       'crm.contact.created',
       'webinar.registration.created',
       'webinar.feedback.submitted',
       'webinar.feedback.marketing_opt_in'
     )
     OR p_actor_id <> 'webinar_public'
     OR p_actor_type <> 'integration'
     OR p_outcome <> 'success'
     OR p_initiator_id IS NOT NULL
     OR p_initiator_type IS NOT NULL
     OR p_approver_id IS NOT NULL
     OR p_approver_type IS NOT NULL
     OR p_approved_at IS NOT NULL
     OR p_error_code IS NOT NULL
     OR p_error_message IS NOT NULL
     OR p_correlation_id IS NOT NULL
     OR p_workflow_id IS NOT NULL
     OR p_request_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_AUDIT_CONTEXT_INVALID';
  END IF;

  IF p_action = 'crm.contact.created' AND p_resource_type <> 'crm_contact' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_CONTACT_RESOURCE_INVALID';
  END IF;
  IF p_action = 'webinar.registration.created' AND p_resource_type <> 'webinar_registration' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_REGISTRATION_RESOURCE_INVALID';
  END IF;
  IF p_action = 'webinar.feedback.submitted'
     AND p_resource_type <> 'webinar_feedback' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_FEEDBACK_RESOURCE_INVALID';
  END IF;
  IF p_action = 'webinar.feedback.marketing_opt_in'
     AND p_resource_type NOT IN ('webinar_feedback', 'webinar_registration') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_CONSENT_RESOURCE_INVALID';
  END IF;

  IF p_resource_id IS NULL
     OR p_resource_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_WEBINAR_RESOURCE_ID_INVALID';
  END IF;

  IF p_action = 'crm.contact.created' AND NOT EXISTS (
    SELECT 1 FROM public.crm_contacts
    WHERE id = p_resource_id::UUID AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_CONTACT_NOT_OWNED';
  END IF;

  IF p_action = 'webinar.registration.created' AND NOT EXISTS (
    SELECT 1 FROM public.webinar_registrations
    WHERE id = p_resource_id::UUID AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_REGISTRATION_NOT_OWNED';
  END IF;

  IF p_action = 'webinar.feedback.submitted'
     AND NOT EXISTS (
       SELECT 1 FROM public.webinar_feedback
       WHERE id = p_resource_id::UUID AND business_id = p_business_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_FEEDBACK_NOT_OWNED';
  END IF;

  IF p_action = 'webinar.feedback.marketing_opt_in'
     AND p_resource_type = 'webinar_feedback'
     AND NOT EXISTS (
       SELECT 1 FROM public.webinar_feedback
       WHERE id = p_resource_id::UUID AND business_id = p_business_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_FEEDBACK_NOT_OWNED';
  END IF;

  IF p_action = 'webinar.feedback.marketing_opt_in'
     AND p_resource_type = 'webinar_registration'
     AND NOT EXISTS (
       SELECT 1 FROM public.webinar_registrations
       WHERE id = p_resource_id::UUID AND business_id = p_business_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_WEBINAR_REGISTRATION_NOT_OWNED';
  END IF;

  v_allowed_keys := CASE p_action
    WHEN 'crm.contact.created' THEN ARRAY['contact_id', 'source', 'stage', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.registration.created' THEN ARRAY['webinar_id', 'registration_id', 'session_count', 'source', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.feedback.submitted' THEN ARRAY['webinar_id', 'registration_id', 'rating', 'was_useful', 'product_interest', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    WHEN 'webinar.feedback.marketing_opt_in' THEN ARRAY['webinar_id', 'registration_id', 'consent', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  IF jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'AUDIT_METADATA_OBJECT_REQUIRED';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key,
    CASE jsonb_typeof(value)
      WHEN 'string' THEN to_jsonb(left(trim(value #>> '{}'), 256))
      ELSE value
    END
  ), '{}'::jsonb)
  INTO v_metadata
  FROM jsonb_each(COALESCE(p_metadata, '{}'::jsonb))
  WHERE key = ANY(v_allowed_keys)
    AND jsonb_typeof(value) IN ('string', 'number', 'boolean', 'array')
    AND (jsonb_typeof(value) <> 'array' OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(value) AS array_item(element)
      WHERE jsonb_typeof(array_item.element) NOT IN ('string', 'number', 'boolean')
    ));

  INSERT INTO public.audit_logs (
    scope, business_id, action, actor_id, actor_type,
    initiator_id, initiator_type, approver_id, approver_type, approved_at,
    resource_type, resource_id, outcome, error_code, error_message,
    correlation_id, workflow_id, request_id, metadata, schema_version
  ) VALUES (
    'business', p_business_id, p_action, 'webinar_public', 'integration',
    NULL, NULL, NULL, NULL, NULL,
    p_resource_type, p_resource_id, 'success', NULL, NULL,
    NULL, NULL, NULL, v_metadata, COALESCE(p_schema_version, 1)
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
