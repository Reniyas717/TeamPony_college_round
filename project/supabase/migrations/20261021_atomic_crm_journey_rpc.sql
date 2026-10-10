-- Nexus atomic CRM and customer-journey mutation RPCs.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.nexus_atomic_owner_business_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
BEGIN
  IF auth.role() <> 'authenticated'
     OR auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'OWNER_SESSION_REQUIRED';
  END IF;
  SELECT b.id INTO v_business_id FROM public.businesses b WHERE b.owner_id = auth.uid();
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'OWNER_BUSINESS_NOT_FOUND';
  END IF;
  RETURN v_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nexus_atomic_text_array(p_value JSONB)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE WHEN jsonb_typeof(COALESCE(p_value, '[]'::jsonb)) = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_value, '[]'::jsonb)))
    ELSE ARRAY[]::text[] END;
$$;

REVOKE ALL ON FUNCTION public.nexus_atomic_owner_business_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.nexus_atomic_text_array(JSONB) FROM PUBLIC, anon, authenticated, service_role;

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
    WHEN 'crm.activity.created' THEN ARRAY['contact_id', 'activity_id', 'activity_type', 'operation_id', 'request_id', 'correlation_id', 'result', 'reason_code']::TEXT[]
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
        'webinar.feedback.submitted',
        'webinar.feedback.marketing_opt_in',
        'webinar.notification.queued'
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
             WHERE id = p_resource_id::UUID
               AND business_id = p_business_id
               AND webinar_id = (p_metadata->>'webinar_id')::UUID
           ) THEN
          RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBINAR_WORKER_JOB_NOT_OWNED';
        END IF;
      END IF;
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
      SELECT 1 FROM jsonb_array_elements(value) element
      WHERE jsonb_typeof(element) NOT IN ('string', 'number', 'boolean')
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

CREATE OR REPLACE FUNCTION public.create_crm_contact_transaction(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT 'lead',
  p_value INTEGER DEFAULT 0,
  p_source TEXT DEFAULT 'manual',
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_next_action_text TEXT DEFAULT NULL,
  p_next_action_due_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_contact public.crm_contacts%ROWTYPE;
  v_activity public.crm_activities%ROWTYPE;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_stage TEXT := lower(trim(COALESCE(p_stage, 'lead')));
  v_source TEXT := lower(trim(COALESCE(NULLIF(p_source, ''), 'manual')));
BEGIN
  IF nullif(trim(p_first_name), '') IS NULL
     OR nullif(trim(p_last_name), '') IS NULL
     OR nullif(trim(p_email), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_REQUIRED_FIELDS';
  END IF;
  IF v_stage NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_STAGE_INVALID';
  END IF;
  IF p_value IS NULL OR p_value < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_VALUE_INVALID';
  END IF;

  INSERT INTO public.crm_contacts (
    business_id, first_name, last_name, email, phone, company, stage, status,
    value, source, tags, next_action_text, next_action_due_at,
    last_activity_at, updated_at
  ) VALUES (
    v_business_id, trim(p_first_name), trim(p_last_name), lower(trim(p_email)),
    NULLIF(p_phone, ''), NULLIF(p_company, ''), v_stage, v_stage, p_value, v_source,
    COALESCE(p_tags, ARRAY[]::TEXT[]), NULLIF(p_next_action_text, ''), p_next_action_due_at,
    v_now, v_now
  )
  RETURNING * INTO v_contact;

  INSERT INTO public.crm_activities (
    business_id, contact_id, type, title, description, actor, metadata
  ) VALUES (
    v_business_id, v_contact.id,
    CASE WHEN v_source = 'website_form' THEN 'form_submission' ELSE 'note' END,
    CASE WHEN v_source = 'website_form' THEN 'Website Lead Captured' ELSE 'Contact Created' END,
    'Lead created via ' || v_source, 'owner',
    jsonb_build_object('source', v_source)
  )
  RETURNING * INTO v_activity;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'crm.contact.created', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'crm_contact',
    p_resource_id => v_contact.id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'contact_id', v_contact.id::TEXT, 'source', v_contact.source, 'stage', v_contact.stage
    )
  );
  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'crm.activity.created', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'crm_activity',
    p_resource_id => v_activity.id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'contact_id', v_contact.id::TEXT, 'activity_id', v_activity.id::TEXT,
      'activity_type', v_activity.type
    )
  );

  RETURN jsonb_build_object('contact', to_jsonb(v_contact), 'activity', to_jsonb(v_activity));
END;
$$;

CREATE OR REPLACE FUNCTION public.update_crm_contact_transaction(
  p_contact_id UUID,
  p_patch JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_existing public.crm_contacts%ROWTYPE;
  v_contact public.crm_contacts%ROWTYPE;
  v_activity public.crm_activities%ROWTYPE;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_stage_changed BOOLEAN := false;
  v_changed_fields TEXT[];
  v_unknown_key TEXT;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_PATCH_OBJECT_REQUIRED';
  END IF;

  SELECT * INTO v_existing FROM public.crm_contacts
  WHERE id = p_contact_id AND business_id = v_business_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT key INTO v_unknown_key
  FROM jsonb_object_keys(p_patch) AS object_key(key)
  WHERE key NOT IN (
    'first_name', 'last_name', 'email', 'phone', 'company', 'stage', 'value',
    'source', 'tags', 'next_action_text', 'next_action_due_at'
  ) LIMIT 1;
  IF v_unknown_key IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_FIELD_NOT_ALLOWED';
  END IF;

  IF p_patch ? 'email' AND nullif(trim(p_patch->>'email'), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_EMAIL_REQUIRED';
  END IF;
  IF p_patch ? 'stage' THEN
    IF lower(trim(p_patch->>'stage')) NOT IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_STAGE_INVALID';
    END IF;
    v_stage_changed := lower(trim(p_patch->>'stage')) IS DISTINCT FROM v_existing.stage;
  END IF;
  IF p_patch ? 'value'
     AND (jsonb_typeof(p_patch->'value') <> 'number' OR (p_patch->>'value')::INTEGER < 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_VALUE_INVALID';
  END IF;
  IF p_patch ? 'tags' AND jsonb_typeof(p_patch->'tags') <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_CONTACT_TAGS_INVALID';
  END IF;

  UPDATE public.crm_contacts
  SET first_name = CASE WHEN p_patch ? 'first_name' THEN p_patch->>'first_name' ELSE first_name END,
      last_name = CASE WHEN p_patch ? 'last_name' THEN p_patch->>'last_name' ELSE last_name END,
      email = CASE WHEN p_patch ? 'email' THEN lower(trim(p_patch->>'email')) ELSE email END,
      phone = CASE WHEN p_patch ? 'phone' THEN NULLIF(p_patch->>'phone', '') ELSE phone END,
      company = CASE WHEN p_patch ? 'company' THEN NULLIF(p_patch->>'company', '') ELSE company END,
      stage = CASE WHEN p_patch ? 'stage' THEN lower(trim(p_patch->>'stage')) ELSE stage END,
      status = CASE WHEN p_patch ? 'stage' THEN lower(trim(p_patch->>'stage')) ELSE status END,
      value = CASE WHEN p_patch ? 'value' THEN (p_patch->>'value')::INTEGER ELSE value END,
      source = CASE WHEN p_patch ? 'source' THEN lower(trim(p_patch->>'source')) ELSE source END,
      tags = CASE WHEN p_patch ? 'tags' THEN public.nexus_atomic_text_array(p_patch->'tags') ELSE tags END,
      next_action_text = CASE WHEN p_patch ? 'next_action_text' THEN NULLIF(p_patch->>'next_action_text', '') ELSE next_action_text END,
      next_action_due_at = CASE
        WHEN p_patch ? 'next_action_due_at' AND jsonb_typeof(p_patch->'next_action_due_at') = 'null' THEN NULL
        WHEN p_patch ? 'next_action_due_at' THEN (p_patch->>'next_action_due_at')::TIMESTAMPTZ
        ELSE next_action_due_at
      END,
      last_activity_at = v_now, updated_at = v_now
  WHERE id = p_contact_id AND business_id = v_business_id
  RETURNING * INTO v_contact;

  v_changed_fields := ARRAY(SELECT key FROM jsonb_object_keys(p_patch) AS object_key(key) ORDER BY key);

  IF v_stage_changed THEN
    INSERT INTO public.crm_activities (
      business_id, contact_id, type, title, description, actor, metadata
    ) VALUES (
      v_business_id, v_contact.id, 'stage_change',
      'Stage moved to ' || v_contact.stage,
      'Stage changed from ' || v_existing.stage || ' to ' || v_contact.stage,
      'owner', jsonb_build_object('previous_stage', v_existing.stage, 'new_stage', v_contact.stage)
    )
    RETURNING * INTO v_activity;
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => CASE WHEN v_stage_changed THEN 'crm.contact.stage_changed' ELSE 'crm.contact.updated' END,
    p_actor_id => auth.uid()::TEXT, p_actor_type => 'user',
    p_resource_type => 'crm_contact', p_resource_id => v_contact.id::TEXT,
    p_outcome => 'success',
    p_metadata => CASE
      WHEN v_stage_changed THEN jsonb_build_object(
        'contact_id', v_contact.id::TEXT, 'previous_stage', v_existing.stage, 'stage', v_contact.stage
      )
      ELSE jsonb_build_object('contact_id', v_contact.id::TEXT, 'changed_fields', to_jsonb(v_changed_fields))
    END
  );

  IF v_activity.id IS NOT NULL THEN
    PERFORM public.record_audit_log_tx(
      p_scope => 'business', p_business_id => v_business_id,
      p_action => 'crm.activity.created', p_actor_id => auth.uid()::TEXT,
      p_actor_type => 'user', p_resource_type => 'crm_activity',
      p_resource_id => v_activity.id::TEXT, p_outcome => 'success',
      p_metadata => jsonb_build_object(
        'contact_id', v_contact.id::TEXT, 'activity_id', v_activity.id::TEXT,
        'activity_type', v_activity.type
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'contact', to_jsonb(v_contact),
    'activity', CASE WHEN v_activity.id IS NULL THEN NULL ELSE to_jsonb(v_activity) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_crm_contact_transaction(p_contact_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_contact public.crm_contacts%ROWTYPE;
BEGIN
  DELETE FROM public.crm_contacts
  WHERE id = p_contact_id AND business_id = v_business_id
  RETURNING * INTO v_contact;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'contact_id', p_contact_id::TEXT);
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'crm.contact.deleted', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'crm_contact',
    p_resource_id => v_contact.id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object('contact_id', v_contact.id::TEXT)
  );
  RETURN jsonb_build_object('deleted', true, 'contact_id', v_contact.id::TEXT);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_crm_activity_transaction(
  p_contact_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'owner',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_activity public.crm_activities%ROWTYPE;
  v_safe_metadata JSONB;
BEGIN
  IF p_type NOT IN ('form_submission', 'stage_change', 'note', 'email_sent', 'ai_agent_action')
     OR p_actor NOT IN ('owner', 'system', 'ai_agent')
     OR nullif(trim(p_title), '') IS NULL
     OR p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_ARGUMENTS_INVALID';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.crm_contacts
    WHERE id = p_contact_id AND business_id = v_business_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CRM_CONTACT_NOT_OWNED';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::JSONB) INTO v_safe_metadata
  FROM jsonb_each(p_metadata)
  WHERE key IN ('previous_stage', 'new_stage', 'source', 'reason', 'contact_id')
    AND jsonb_typeof(value) IN ('string', 'number', 'boolean');

  INSERT INTO public.crm_activities (
    business_id, contact_id, type, title, description, actor, metadata
  ) VALUES (
    v_business_id, p_contact_id, p_type, trim(p_title), NULLIF(trim(p_description), ''),
    p_actor, v_safe_metadata
  )
  RETURNING * INTO v_activity;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'crm.activity.created', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'crm_activity',
    p_resource_id => v_activity.id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'contact_id', p_contact_id::TEXT, 'activity_id', v_activity.id::TEXT,
      'activity_type', p_type
    )
  );
  RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_crm_activity_transaction(
  p_activity_id UUID,
  p_patch JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_existing public.crm_activities%ROWTYPE;
  v_activity public.crm_activities%ROWTYPE;
  v_safe_metadata JSONB;
  v_unknown_key TEXT;
  v_changed_fields TEXT[];
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_PATCH_OBJECT_REQUIRED';
  END IF;
  SELECT * INTO v_existing FROM public.crm_activities
  WHERE id = p_activity_id AND business_id = v_business_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT key INTO v_unknown_key
  FROM jsonb_object_keys(p_patch) AS object_key(key)
  WHERE key NOT IN ('type', 'title', 'description', 'actor', 'metadata')
  LIMIT 1;
  IF v_unknown_key IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_FIELD_NOT_ALLOWED';
  END IF;
  IF p_patch ? 'type' AND p_patch->>'type' NOT IN ('form_submission', 'stage_change', 'note', 'email_sent', 'ai_agent_action') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_TYPE_INVALID';
  END IF;
  IF p_patch ? 'actor' AND p_patch->>'actor' NOT IN ('owner', 'system', 'ai_agent') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_ACTOR_INVALID';
  END IF;
  IF p_patch ? 'title' AND nullif(trim(p_patch->>'title'), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_TITLE_REQUIRED';
  END IF;

  IF p_patch ? 'metadata' THEN
    IF jsonb_typeof(p_patch->'metadata') <> 'object' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CRM_ACTIVITY_METADATA_INVALID';
    END IF;
    SELECT COALESCE(jsonb_object_agg(key, value), '{}'::JSONB) INTO v_safe_metadata
    FROM jsonb_each(p_patch->'metadata')
    WHERE key IN ('previous_stage', 'new_stage', 'source', 'reason', 'contact_id')
      AND jsonb_typeof(value) IN ('string', 'number', 'boolean');
  ELSE
    v_safe_metadata := v_existing.metadata;
  END IF;

  UPDATE public.crm_activities
  SET type = CASE WHEN p_patch ? 'type' THEN p_patch->>'type' ELSE type END,
      title = CASE WHEN p_patch ? 'title' THEN trim(p_patch->>'title') ELSE title END,
      description = CASE
        WHEN p_patch ? 'description' AND jsonb_typeof(p_patch->'description') = 'null' THEN NULL
        WHEN p_patch ? 'description' THEN NULLIF(trim(p_patch->>'description'), '')
        ELSE description
      END,
      actor = CASE WHEN p_patch ? 'actor' THEN p_patch->>'actor' ELSE actor END,
      metadata = v_safe_metadata
  WHERE id = p_activity_id AND business_id = v_business_id
  RETURNING * INTO v_activity;

  v_changed_fields := ARRAY(SELECT key FROM jsonb_object_keys(p_patch) AS object_key(key) ORDER BY key);
  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'crm.activity.updated', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'crm_activity',
    p_resource_id => v_activity.id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'contact_id', v_activity.contact_id::TEXT, 'activity_id', v_activity.id::TEXT,
      'changed_fields', to_jsonb(v_changed_fields)
    )
  );
  RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_crm_activity_transaction(p_activity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_activity public.crm_activities%ROWTYPE;
BEGIN
  DELETE FROM public.crm_activities
  WHERE id = p_activity_id AND business_id = v_business_id
  RETURNING * INTO v_activity;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'activity_id', p_activity_id::TEXT);
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'crm.activity.deleted', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'crm_activity',
    p_resource_id => v_activity.id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'contact_id', v_activity.contact_id::TEXT, 'activity_id', v_activity.id::TEXT
    )
  );
  RETURN jsonb_build_object('deleted', true, 'activity_id', v_activity.id::TEXT);
END;
$$;

-- CRM mutation functions are the only authenticated write seams. Direct table
-- writes remain revoked; the owner lookup helper is intentionally inaccessible
-- as a callable client function.
REVOKE ALL ON FUNCTION public.create_crm_contact_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[], TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_crm_contact_transaction(UUID, JSONB) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_crm_contact_transaction(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_crm_activity_transaction(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_crm_activity_transaction(UUID, JSONB) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_crm_activity_transaction(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_crm_contact_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[], TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_crm_contact_transaction(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_crm_contact_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_crm_activity_transaction(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_crm_activity_transaction(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_crm_activity_transaction(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_customer_journey_map_transaction(p_map JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_map_id UUID;
  v_stage RECORD;
  v_action RECORD;
  v_stage_id UUID;
  v_action_id UUID;
  v_metadata JSONB;
  v_stage_count INTEGER := 0;
BEGIN
  IF p_map IS NULL OR jsonb_typeof(p_map) <> 'object'
     OR nullif(trim(p_map->>'title'), '') IS NULL
     OR nullif(trim(p_map->>'objective'), '') IS NULL
     OR jsonb_typeof(p_map->'stages') <> 'array'
     OR jsonb_array_length(p_map->'stages') = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'JOURNEY_MAP_PAYLOAD_INVALID';
  END IF;

  v_map_id := CASE
    WHEN nullif(p_map->>'id', '') IS NULL THEN gen_random_uuid()
    ELSE (p_map->>'id')::UUID
  END;
  v_metadata := CASE
    WHEN jsonb_typeof(p_map->'metadata') = 'object' THEN p_map->'metadata'
    ELSE '{}'::JSONB
  END;

  INSERT INTO public.customer_journey_maps (
    id, business_id, title, objective, archetype, target_persona, status, metadata
  ) VALUES (
    v_map_id, v_business_id, trim(p_map->>'title'), trim(p_map->>'objective'),
    COALESCE(NULLIF(p_map->>'journey_type', ''), NULLIF(p_map->>'archetype', ''), 'custom'),
    COALESCE(NULLIF(p_map->>'target_persona', ''), 'Target Customer'),
    COALESCE(NULLIF(p_map->>'status', ''), 'ACTIVE'), v_metadata
  );

  FOR v_stage IN SELECT stage_value FROM jsonb_array_elements(p_map->'stages') AS stage_elements(stage_value) LOOP
    v_stage_id := CASE
      WHEN nullif(v_stage.stage_value->>'id', '') IS NULL THEN gen_random_uuid()
      ELSE (v_stage.stage_value->>'id')::UUID
    END;

    INSERT INTO public.journey_map_stages (
      id, journey_map_id, business_id, order_index, stage_key, stage_name,
      description, objective, customer_needs, findings_type, customer_actions,
      customer_thoughts, emotion, touchpoints, pain_points, opportunities
    ) VALUES (
      v_stage_id, v_map_id, v_business_id,
      COALESCE((v_stage.stage_value->>'order_index')::INTEGER, v_stage_count + 1),
      COALESCE(NULLIF(v_stage.stage_value->>'stage_key', ''), 'stage_' || (v_stage_count + 1)::TEXT),
      COALESCE(NULLIF(v_stage.stage_value->>'stage_name', ''), 'Untitled stage'),
      COALESCE(NULLIF(v_stage.stage_value->>'objective', ''), NULLIF(v_stage.stage_value->>'description', ''), ''),
      COALESCE(NULLIF(v_stage.stage_value->>'objective', ''), NULLIF(v_stage.stage_value->>'description', ''), ''),
      public.nexus_atomic_text_array(v_stage.stage_value->'customer_needs'),
      COALESCE(NULLIF(v_stage.stage_value->>'findings_type', ''), 'hypothesis'),
      public.nexus_atomic_text_array(v_stage.stage_value->'customer_actions'),
      public.nexus_atomic_text_array(v_stage.stage_value->'customer_thoughts'),
      COALESCE(NULLIF(v_stage.stage_value->>'emotion', ''), 'neutral'),
      public.nexus_atomic_text_array(v_stage.stage_value->'touchpoints'),
      public.nexus_atomic_text_array(COALESCE(v_stage.stage_value->'friction_points', v_stage.stage_value->'pain_points')),
      public.nexus_atomic_text_array(v_stage.stage_value->'opportunities')
    );
    v_stage_count := v_stage_count + 1;

    FOR v_action IN
      SELECT action_value FROM jsonb_array_elements(COALESCE(v_stage.stage_value->'actions', '[]'::JSONB)) AS action_elements(action_value)
    LOOP
      v_action_id := CASE
        WHEN nullif(v_action.action_value->>'id', '') IS NULL THEN gen_random_uuid()
        ELSE (v_action.action_value->>'id')::UUID
      END;

      INSERT INTO public.journey_stage_actions (
        id, stage_id, journey_map_id, business_id, title, description,
        why_it_helps, module_target, suggested_action_type, evidence_type,
        action_payload, expected_impact, status, idempotency_key
      ) VALUES (
        v_action_id, v_stage_id, v_map_id, v_business_id,
        COALESCE(NULLIF(v_action.action_value->>'title', ''), 'Untitled action'),
        COALESCE(NULLIF(v_action.action_value->>'description', ''), ''),
        COALESCE(
          NULLIF(v_action.action_value->>'why_it_helps', ''),
          NULLIF(v_action.action_value->'__nexus'->>'why_it_helps', ''),
          'Helps remove friction and guides the customer to the next journey step'
        ),
        COALESCE(NULLIF(v_action.action_value->>'module_target', ''), 'crm'),
        COALESCE(NULLIF(v_action.action_value->>'suggested_action_type', ''), 'REVIEW'),
        COALESCE(
          NULLIF(v_action.action_value->>'evidence_type', ''),
          NULLIF(v_action.action_value->'__nexus'->>'evidence_type', ''),
          'hypothesis'
        ),
        CASE WHEN jsonb_typeof(v_action.action_value->'action_payload') = 'object'
          THEN v_action.action_value->'action_payload' ELSE '{}'::JSONB END,
        COALESCE(NULLIF(v_action.action_value->>'expected_impact', ''), ''),
        COALESCE(NULLIF(v_action.action_value->>'status', ''), 'PROPOSED'),
        COALESCE(NULLIF(v_action.action_value->>'idempotency_key', ''), v_action_id::TEXT)
      );
    END LOOP;
  END LOOP;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'journey.map.created', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'customer_journey_map',
    p_resource_id => v_map_id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object('journey_map_id', v_map_id::TEXT, 'stage_count', v_stage_count)
  );

  RETURN jsonb_build_object(
    'journey_map_id', v_map_id,
    'map', (SELECT to_jsonb(m) FROM public.customer_journey_maps m
            WHERE m.id = v_map_id AND m.business_id = v_business_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_journey_stage_transaction(
  p_map_id UUID,
  p_stage JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_map public.customer_journey_maps%ROWTYPE;
  v_stage public.journey_map_stages%ROWTYPE;
  v_stage_key TEXT;
  v_stage_context JSONB;
  v_metadata JSONB;
  v_order_index INTEGER;
BEGIN
  IF p_stage IS NULL OR jsonb_typeof(p_stage) <> 'object'
     OR nullif(trim(p_stage->>'stage_name'), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'JOURNEY_STAGE_PAYLOAD_INVALID';
  END IF;

  SELECT * INTO v_map FROM public.customer_journey_maps
  WHERE id = p_map_id AND business_id = v_business_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_order_index
  FROM public.journey_map_stages
  WHERE journey_map_id = p_map_id AND business_id = v_business_id;

  v_stage_key := COALESCE(NULLIF(p_stage->>'stage_key', ''), 'custom_' || gen_random_uuid()::TEXT);

  INSERT INTO public.journey_map_stages (
    id, journey_map_id, business_id, order_index, stage_key, stage_name,
    description, objective, customer_needs, findings_type, customer_actions,
    customer_thoughts, emotion, touchpoints, pain_points, opportunities
  ) VALUES (
    COALESCE(NULLIF(p_stage->>'id', '')::UUID, gen_random_uuid()),
    p_map_id, v_business_id, v_order_index, v_stage_key, trim(p_stage->>'stage_name'),
    COALESCE(NULLIF(p_stage->>'objective', ''), 'Define the customer objective at this stage'),
    COALESCE(NULLIF(p_stage->>'objective', ''), 'Define the customer objective at this stage'),
    CASE WHEN p_stage ? 'customer_needs'
      THEN public.nexus_atomic_text_array(p_stage->'customer_needs')
      ELSE ARRAY['Clear outcome']::TEXT[] END,
    COALESCE(NULLIF(p_stage->>'findings_type', ''), 'hypothesis'),
    CASE WHEN p_stage ? 'customer_actions'
      THEN public.nexus_atomic_text_array(p_stage->'customer_actions')
      ELSE ARRAY['Interacts with platform']::TEXT[] END,
    CASE WHEN p_stage ? 'customer_thoughts'
      THEN public.nexus_atomic_text_array(p_stage->'customer_thoughts')
      ELSE ARRAY['What is the next step?']::TEXT[] END,
    COALESCE(NULLIF(p_stage->>'emotion', ''), 'neutral'),
    CASE WHEN p_stage ? 'touchpoints'
      THEN public.nexus_atomic_text_array(p_stage->'touchpoints')
      ELSE ARRAY['Website']::TEXT[] END,
    CASE WHEN p_stage ? 'friction_points'
      THEN public.nexus_atomic_text_array(p_stage->'friction_points')
      ELSE ARRAY['Potential friction point']::TEXT[] END,
    CASE WHEN p_stage ? 'opportunities'
      THEN public.nexus_atomic_text_array(p_stage->'opportunities')
      ELSE ARRAY['Opportunity for improvement']::TEXT[] END
  )
  RETURNING * INTO v_stage;

  v_metadata := CASE WHEN jsonb_typeof(v_map.metadata) = 'object' THEN v_map.metadata ELSE '{}'::JSONB END;
  v_stage_context := CASE WHEN jsonb_typeof(v_metadata->'stage_context') = 'object'
      THEN v_metadata->'stage_context' ELSE '{}'::JSONB END
    || jsonb_build_object(
      v_stage_key, jsonb_build_object(
        'customer_needs', v_stage.customer_needs,
        'findings_type', v_stage.findings_type
      )
    );

  UPDATE public.customer_journey_maps
  SET metadata = jsonb_set(v_metadata, '{stage_context}', v_stage_context, true),
      updated_at = clock_timestamp()
  WHERE id = p_map_id AND business_id = v_business_id;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'journey.stage.created', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'journey_map_stage',
    p_resource_id => v_stage.id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'journey_map_id', p_map_id::TEXT, 'stage_id', v_stage.id::TEXT,
      'order_index', v_stage.order_index
    )
  );
  RETURN to_jsonb(v_stage);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_journey_stage_transaction(
  p_map_id UUID,
  p_stage_id UUID,
  p_patch JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_map public.customer_journey_maps%ROWTYPE;
  v_existing public.journey_map_stages%ROWTYPE;
  v_stage public.journey_map_stages%ROWTYPE;
  v_metadata JSONB;
  v_stage_context JSONB;
  v_unknown_key TEXT;
  v_changed_fields TEXT[];
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'JOURNEY_STAGE_PATCH_OBJECT_REQUIRED';
  END IF;

  SELECT * INTO v_map FROM public.customer_journey_maps
  WHERE id = p_map_id AND business_id = v_business_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_existing FROM public.journey_map_stages
  WHERE id = p_stage_id AND journey_map_id = p_map_id AND business_id = v_business_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT key INTO v_unknown_key
  FROM jsonb_object_keys(p_patch) AS object_key(key)
  WHERE key NOT IN (
    'stage_name', 'objective', 'customer_actions', 'touchpoints',
    'customer_needs', 'customer_thoughts', 'emotion', 'friction_points',
    'opportunities', 'findings_type'
  ) LIMIT 1;
  IF v_unknown_key IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'JOURNEY_STAGE_FIELD_NOT_ALLOWED';
  END IF;

  IF p_patch ? 'findings_type'
     AND p_patch->>'findings_type' NOT IN ('hypothesis', 'data_backed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'JOURNEY_FINDINGS_TYPE_INVALID';
  END IF;

  UPDATE public.journey_map_stages
  SET stage_name = CASE WHEN p_patch ? 'stage_name' THEN trim(p_patch->>'stage_name') ELSE stage_name END,
      description = CASE WHEN p_patch ? 'objective' THEN p_patch->>'objective' ELSE description END,
      objective = CASE WHEN p_patch ? 'objective' THEN p_patch->>'objective' ELSE objective END,
      customer_actions = CASE WHEN p_patch ? 'customer_actions'
        THEN public.nexus_atomic_text_array(p_patch->'customer_actions') ELSE customer_actions END,
      touchpoints = CASE WHEN p_patch ? 'touchpoints'
        THEN public.nexus_atomic_text_array(p_patch->'touchpoints') ELSE touchpoints END,
      customer_needs = CASE WHEN p_patch ? 'customer_needs'
        THEN public.nexus_atomic_text_array(p_patch->'customer_needs') ELSE customer_needs END,
      customer_thoughts = CASE WHEN p_patch ? 'customer_thoughts'
        THEN public.nexus_atomic_text_array(p_patch->'customer_thoughts') ELSE customer_thoughts END,
      emotion = CASE WHEN p_patch ? 'emotion' THEN p_patch->>'emotion' ELSE emotion END,
      pain_points = CASE WHEN p_patch ? 'friction_points'
        THEN public.nexus_atomic_text_array(p_patch->'friction_points') ELSE pain_points END,
      opportunities = CASE WHEN p_patch ? 'opportunities'
        THEN public.nexus_atomic_text_array(p_patch->'opportunities') ELSE opportunities END,
      findings_type = CASE WHEN p_patch ? 'findings_type' THEN p_patch->>'findings_type' ELSE findings_type END,
      updated_at = clock_timestamp()
  WHERE id = p_stage_id AND journey_map_id = p_map_id AND business_id = v_business_id
  RETURNING * INTO v_stage;

  IF p_patch ? 'customer_needs' OR p_patch ? 'findings_type' THEN
    v_metadata := CASE WHEN jsonb_typeof(v_map.metadata) = 'object' THEN v_map.metadata ELSE '{}'::JSONB END;
    v_stage_context := COALESCE(v_metadata->'stage_context', '{}'::JSONB)
      || jsonb_build_object(
        v_existing.stage_key, jsonb_build_object(
          'customer_needs', v_stage.customer_needs,
          'findings_type', v_stage.findings_type
        )
      );
    UPDATE public.customer_journey_maps
    SET metadata = jsonb_set(v_metadata, '{stage_context}', v_stage_context, true),
        updated_at = clock_timestamp()
    WHERE id = p_map_id AND business_id = v_business_id;
  END IF;

  v_changed_fields := ARRAY(SELECT key FROM jsonb_object_keys(p_patch) AS object_key(key) ORDER BY key);
  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'journey.stage.updated', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'journey_map_stage',
    p_resource_id => p_stage_id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'journey_map_id', p_map_id::TEXT, 'stage_id', p_stage_id::TEXT,
      'changed_fields', to_jsonb(v_changed_fields)
    )
  );
  RETURN to_jsonb(v_stage);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_journey_stage_transaction(
  p_map_id UUID,
  p_stage_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_deleted public.journey_map_stages%ROWTYPE;
  v_stage RECORD;
  v_metadata JSONB;
  v_stage_context JSONB;
  v_remaining INTEGER;
  v_order INTEGER := 0;
BEGIN
  SELECT * INTO v_deleted FROM public.journey_map_stages
  WHERE id = p_stage_id AND journey_map_id = p_map_id AND business_id = v_business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'stage_id', p_stage_id::TEXT);
  END IF;

  SELECT count(*) INTO v_remaining FROM public.journey_map_stages
  WHERE journey_map_id = p_map_id AND business_id = v_business_id;
  IF v_remaining <= 1 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'JOURNEY_LAST_STAGE';
  END IF;

  DELETE FROM public.journey_map_stages
  WHERE id = p_stage_id AND journey_map_id = p_map_id AND business_id = v_business_id;

  FOR v_stage IN
    SELECT id FROM public.journey_map_stages
    WHERE journey_map_id = p_map_id AND business_id = v_business_id
    ORDER BY order_index, id
  LOOP
    v_order := v_order + 1;
    UPDATE public.journey_map_stages
    SET order_index = v_order, updated_at = clock_timestamp()
    WHERE id = v_stage.id AND journey_map_id = p_map_id AND business_id = v_business_id;
  END LOOP;

  SELECT metadata INTO v_metadata FROM public.customer_journey_maps
  WHERE id = p_map_id AND business_id = v_business_id FOR UPDATE;
  v_metadata := CASE WHEN jsonb_typeof(v_metadata) = 'object' THEN v_metadata ELSE '{}'::JSONB END;
  v_stage_context := COALESCE(v_metadata->'stage_context', '{}'::JSONB) - v_deleted.stage_key;

  UPDATE public.customer_journey_maps
  SET metadata = jsonb_set(v_metadata, '{stage_context}', v_stage_context, true),
      updated_at = clock_timestamp()
  WHERE id = p_map_id AND business_id = v_business_id;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'journey.stage.deleted', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'journey_map_stage',
    p_resource_id => p_stage_id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object('journey_map_id', p_map_id::TEXT, 'stage_id', p_stage_id::TEXT)
  );
  RETURN jsonb_build_object('deleted', true, 'stage_id', p_stage_id::TEXT);
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_journey_action_transaction(
  p_map_id UUID,
  p_action_id UUID,
  p_decision TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_action public.journey_stage_actions%ROWTYPE;
  v_payload JSONB;
  v_result JSONB;
  v_audit_action TEXT;
BEGIN
  IF p_decision NOT IN ('approve', 'dismiss') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'JOURNEY_ACTION_DECISION_INVALID';
  END IF;

  SELECT * INTO v_action
  FROM public.journey_stage_actions a
  WHERE a.id = p_action_id AND a.journey_map_id = p_map_id
    AND a.business_id = v_business_id
    AND EXISTS (
      SELECT 1 FROM public.journey_map_stages s
      WHERE s.id = a.stage_id AND s.journey_map_id = a.journey_map_id
        AND s.business_id = a.business_id
    )
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_payload := CASE
    WHEN jsonb_typeof(v_action.action_payload) = 'object' THEN v_action.action_payload
    ELSE '{}'::JSONB END;
  v_result := CASE
    WHEN p_decision = 'approve' THEN jsonb_build_object(
      'message', 'Proposal approved. No downstream module change was executed.',
      'target_module', 'proposal'
    )
    ELSE 'null'::JSONB END;
  v_payload := jsonb_set(v_payload, '{__nexus,execution_result}', v_result, true);

  UPDATE public.journey_stage_actions
  SET status = CASE WHEN p_decision = 'approve' THEN 'APPROVED' ELSE 'DISMISSED' END,
      executed_at = NULL, action_payload = v_payload
  WHERE id = p_action_id AND journey_map_id = p_map_id AND business_id = v_business_id
  RETURNING * INTO v_action;

  v_audit_action := CASE WHEN p_decision = 'approve'
    THEN 'journey.action.approved' ELSE 'journey.action.dismissed' END;
  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => v_audit_action, p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'journey_stage_action',
    p_resource_id => p_action_id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object('journey_map_id', p_map_id::TEXT, 'action_id', p_action_id::TEXT)
  );
  RETURN to_jsonb(v_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_customer_journey_map_transaction(p_map_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID := public.nexus_atomic_owner_business_id();
  v_map_id UUID;
BEGIN
  DELETE FROM public.customer_journey_maps
  WHERE id = p_map_id AND business_id = v_business_id
  RETURNING id INTO v_map_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'journey_map_id', p_map_id::TEXT);
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business', p_business_id => v_business_id,
    p_action => 'journey.map.deleted', p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user', p_resource_type => 'customer_journey_map',
    p_resource_id => v_map_id::TEXT, p_outcome => 'success',
    p_metadata => jsonb_build_object('journey_map_id', v_map_id::TEXT)
  );
  RETURN jsonb_build_object('deleted', true, 'journey_map_id', v_map_id::TEXT);
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

DO $$
DECLARE
  v_signature TEXT;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.create_crm_contact_transaction(text,text,text,text,text,text,integer,text,text[],text,timestamptz)',
    'public.update_crm_contact_transaction(uuid,jsonb)',
    'public.delete_crm_contact_transaction(uuid)',
    'public.create_crm_activity_transaction(uuid,text,text,text,text,jsonb)',
    'public.update_crm_activity_transaction(uuid,jsonb)',
    'public.delete_crm_activity_transaction(uuid)',
    'public.generate_customer_journey_map_transaction(jsonb)',
    'public.add_journey_stage_transaction(uuid,jsonb)',
    'public.update_journey_stage_transaction(uuid,uuid,jsonb)',
    'public.delete_journey_stage_transaction(uuid,uuid)',
    'public.decide_journey_action_transaction(uuid,uuid,text)',
    'public.delete_customer_journey_map_transaction(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, service_role', to_regprocedure(v_signature));
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', to_regprocedure(v_signature));
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Owners can read journey stage actions" ON public.journey_stage_actions;
DROP POLICY IF EXISTS "Owners can manage journey stage actions" ON public.journey_stage_actions;
CREATE POLICY "Owners can read journey stage actions"
  ON public.journey_stage_actions FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can manage journey maps" ON public.customer_journey_maps;
CREATE POLICY "Owners can read journey maps"
  ON public.customer_journey_maps FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owners can manage journey stages" ON public.journey_map_stages;
CREATE POLICY "Owners can read journey stages"
  ON public.journey_map_stages FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Business mutations now cross owner-checked transaction RPCs. Browser roles
-- keep read access under the owner policies, but cannot bypass audit recording.
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.crm_contacts, public.crm_activities,
  public.customer_journey_maps, public.journey_map_stages,
  public.journey_stage_actions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE
  public.crm_contacts, public.crm_activities,
  public.customer_journey_maps, public.journey_map_stages,
  public.journey_stage_actions
  TO authenticated;

COMMIT;
