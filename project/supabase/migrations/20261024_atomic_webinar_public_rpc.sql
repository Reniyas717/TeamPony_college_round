-- Atomic public webinar registration and feedback audit coverage.
--
-- The existing public RPCs own the validated slug/token, capacity, duplicate,
-- session-selection, feedback, and consent rules. Rename those implementations
-- and wrap them so their writes and required audit events share one transaction.

DO $$
BEGIN
  IF to_regprocedure('public.nexus_record_audit_log_tx_legacy(text,uuid,text,text,text,text,text,text,jsonb,text,text,text,text,timestamptz,text,text,text,text,text,integer)') IS NULL
     AND to_regprocedure('public.record_audit_log_tx(text,uuid,text,text,text,text,text,text,jsonb,text,text,text,text,timestamptz,text,text,text,text,text,integer)') IS NOT NULL THEN
    ALTER FUNCTION public.record_audit_log_tx(
      TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
      TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
    ) RENAME TO nexus_record_audit_log_tx_legacy;
  END IF;

  IF to_regprocedure('public.nexus_register_public_webinar_attendee_legacy(text,text,text,text[],boolean)') IS NULL
     AND to_regprocedure('public.register_public_webinar_attendee(text,text,text,text[],boolean)') IS NOT NULL THEN
    ALTER FUNCTION public.register_public_webinar_attendee(TEXT, TEXT, TEXT, TEXT[], BOOLEAN)
      RENAME TO nexus_register_public_webinar_attendee_legacy;
  END IF;

  IF to_regprocedure('public.nexus_submit_public_webinar_feedback_legacy(text,integer,boolean,text,boolean,boolean)') IS NULL
     AND to_regprocedure('public.submit_public_webinar_feedback(text,integer,boolean,text,boolean,boolean)') IS NOT NULL THEN
    ALTER FUNCTION public.submit_public_webinar_feedback(TEXT, INTEGER, BOOLEAN, TEXT, BOOLEAN, BOOLEAN)
      RENAME TO nexus_submit_public_webinar_feedback_legacy;
  END IF;
END;
$$;

-- Keep the original audit implementation available to all existing owner and
-- worker callers through the replacement below, but never expose the renamed
-- implementation as a public RPC.
REVOKE ALL ON FUNCTION public.nexus_record_audit_log_tx_legacy(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;

-- The replacement audit seam admits one tightly constrained internal path for
-- public webinar RPCs. All other callers use the existing central validator.
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
  v_public_webinar BOOLEAN := current_setting('nexus.public_webinar_audit', true) = '1';
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

REVOKE ALL ON FUNCTION public.record_audit_log_tx(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_audit_log_tx(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) TO authenticated, service_role;

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
BEGIN
  PERFORM set_config('nexus.public_webinar_audit', '1', true);
  RETURN public.record_audit_log_tx(
    'business', p_business_id, p_action, 'webinar_public', 'integration',
    p_resource_type, p_resource_id::TEXT, 'success', COALESCE(p_metadata, '{}'::jsonb),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.nexus_record_public_webinar_audit(UUID, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.nexus_register_public_webinar_attendee_legacy(TEXT, TEXT, TEXT, TEXT[], BOOLEAN)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.nexus_submit_public_webinar_feedback_legacy(TEXT, INTEGER, BOOLEAN, TEXT, BOOLEAN, BOOLEAN)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.register_public_webinar_attendee(
  p_public_slug TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_selected_session_slugs TEXT[] DEFAULT NULL,
  p_marketing_opt_in BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_existing_contact_id UUID;
  v_contact_id UUID;
  v_registration_id UUID;
  v_webinar_id UUID;
  v_result JSONB;
BEGIN
  SELECT w.business_id
  INTO v_business_id
  FROM public.webinars w
  WHERE lower(w.public_slug) = lower(trim(p_public_slug))
    AND w.status IN ('scheduled', 'live')
    AND w.provisioning_status = 'ready'
    AND w.meeting_uri IS NOT NULL
  LIMIT 1;

  IF v_business_id IS NULL THEN
    SELECT w.business_id
    INTO v_business_id
    FROM public.webinars w
    JOIN public.webinar_series s ON s.id = w.series_id
    WHERE lower(s.public_slug) = lower(trim(p_public_slug))
      AND w.status IN ('scheduled', 'live')
      AND w.provisioning_status = 'ready'
      AND w.meeting_uri IS NOT NULL
    ORDER BY w.scheduled_start
    LIMIT 1;
  END IF;

  IF v_business_id IS NOT NULL THEN
    -- Serialize public registrations for one business so the pre-call contact
    -- snapshot can distinguish creation from reuse without changing the legacy
    -- capacity or duplicate handling.
    PERFORM 1 FROM public.businesses WHERE id = v_business_id FOR UPDATE;
    SELECT c.id
    INTO v_existing_contact_id
    FROM public.crm_contacts c
    WHERE c.business_id = v_business_id
      AND lower(trim(c.email)) = lower(trim(p_email))
    LIMIT 1;
  END IF;

  v_result := public.nexus_register_public_webinar_attendee_legacy(
    p_public_slug, p_full_name, p_email, p_selected_session_slugs, p_marketing_opt_in
  );
  v_registration_id := NULLIF(v_result->>'registration_id', '')::UUID;
  v_contact_id := NULLIF(v_result->>'contact_id', '')::UUID;
  SELECT rs.webinar_id
  INTO v_webinar_id
  FROM public.webinar_registration_sessions rs
  WHERE rs.business_id = v_business_id
    AND rs.registration_id = v_registration_id
  ORDER BY rs.webinar_id
  LIMIT 1;

  IF v_business_id IS NOT NULL
     AND v_existing_contact_id IS NULL
     AND v_contact_id IS NOT NULL THEN
    PERFORM public.nexus_record_public_webinar_audit(
      v_business_id,
      'crm.contact.created',
      'crm_contact',
      v_contact_id,
      jsonb_build_object('contact_id', v_contact_id::TEXT, 'source', 'webinar', 'stage', 'lead')
    );
  END IF;

  IF v_business_id IS NOT NULL AND v_registration_id IS NOT NULL THEN
    PERFORM public.nexus_record_public_webinar_audit(
      v_business_id,
      'webinar.registration.created',
      'webinar_registration',
      v_registration_id,
      jsonb_build_object(
        'webinar_id', v_webinar_id::TEXT,
        'registration_id', v_registration_id::TEXT,
        'session_count', COALESCE(jsonb_array_length(v_result->'session_slugs'), 0),
        'source', 'public_registration'
      )
    );

    IF COALESCE(p_marketing_opt_in, false) THEN
      PERFORM public.nexus_record_public_webinar_audit(
        v_business_id,
        'webinar.feedback.marketing_opt_in',
        'webinar_registration',
        v_registration_id,
        jsonb_build_object(
          'webinar_id', v_webinar_id::TEXT,
          'registration_id', v_registration_id::TEXT,
          'consent', true
        )
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_webinar_feedback(
  p_token_hash TEXT,
  p_rating INTEGER,
  p_was_useful BOOLEAN,
  p_comments TEXT DEFAULT NULL,
  p_product_interest BOOLEAN DEFAULT false,
  p_marketing_opt_in BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_feedback RECORD;
  v_result JSONB;
BEGIN
  SELECT f.id, f.business_id, f.webinar_id, f.registration_id
  INTO v_feedback
  FROM public.webinar_feedback f
  WHERE f.token_hash = lower(trim(p_token_hash))
  FOR UPDATE;

  v_result := public.nexus_submit_public_webinar_feedback_legacy(
    p_token_hash, p_rating, p_was_useful, p_comments, p_product_interest, p_marketing_opt_in
  );

  IF v_feedback.id IS NOT NULL THEN
    PERFORM public.nexus_record_public_webinar_audit(
      v_feedback.business_id,
      'webinar.feedback.submitted',
      'webinar_feedback',
      v_feedback.id,
      jsonb_build_object(
        'webinar_id', v_feedback.webinar_id::TEXT,
        'registration_id', v_feedback.registration_id::TEXT,
        'rating', p_rating,
        'was_useful', p_was_useful,
        'product_interest', COALESCE(p_product_interest, false)
      )
    );

    IF COALESCE(p_marketing_opt_in, false) THEN
      PERFORM public.nexus_record_public_webinar_audit(
        v_feedback.business_id,
        'webinar.feedback.marketing_opt_in',
        'webinar_feedback',
        v_feedback.id,
        jsonb_build_object(
          'webinar_id', v_feedback.webinar_id::TEXT,
          'registration_id', v_feedback.registration_id::TEXT,
          'consent', true
        )
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.register_public_webinar_attendee(TEXT, TEXT, TEXT, TEXT[], BOOLEAN)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_webinar_feedback(TEXT, INTEGER, BOOLEAN, TEXT, BOOLEAN, BOOLEAN)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_webinar_attendee(TEXT, TEXT, TEXT, TEXT[], BOOLEAN)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_webinar_feedback(TEXT, INTEGER, BOOLEAN, TEXT, BOOLEAN, BOOLEAN)
  TO anon, authenticated;

