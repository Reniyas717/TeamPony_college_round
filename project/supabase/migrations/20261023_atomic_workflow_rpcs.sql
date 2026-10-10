-- Atomic workflow state transitions
-- Depends on 20261020_tenant_isolation_compatibility.sql.
--
-- These functions are intentionally operation-specific. They derive the
-- business from auth.uid(), verify every workflow/run relationship, and write
-- the central audit row before returning. A failed audit insert rolls back the
-- workflow mutation in the same RPC transaction.

CREATE OR REPLACE FUNCTION public.workflow_create_run_with_audit(
  p_workflow_id UUID,
  p_trigger_event_id TEXT,
  p_event_payload JSONB,
  p_started_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_run public.workflow_runs;
  v_started_at TIMESTAMPTZ := COALESCE(p_started_at, timezone('utc'::text, now()));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_AUTH_REQUIRED';
  END IF;

  IF p_event_payload IS NULL OR jsonb_typeof(p_event_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_EVENT_PAYLOAD_INVALID';
  END IF;

  SELECT w.business_id
  INTO v_business_id
  FROM public.automation_workflows w
  JOIN public.businesses b ON b.id = w.business_id
  WHERE w.id = p_workflow_id
    AND b.owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_NOT_OWNED';
  END IF;

  INSERT INTO public.workflow_runs (
    workflow_id,
    business_id,
    trigger_event_id,
    status,
    current_node_id,
    context_data,
    error_details,
    started_at,
    completed_at,
    initiated_by,
    approved_by,
    approval_requested_at,
    approval_decided_at,
    approval_reason,
    last_step_at,
    run_version
  ) VALUES (
    p_workflow_id,
    v_business_id,
    p_trigger_event_id,
    'RUNNING',
    NULL,
    jsonb_set(
      p_event_payload,
      '{_workflow}',
      jsonb_build_object(
        'initiator_id', auth.uid()::TEXT,
        'initiator_type', 'user',
        'execution_mode', 'manual',
        'initiated_at', v_started_at
      ),
      true
    ),
    NULL,
    v_started_at,
    NULL,
    auth.uid(),
    NULL,
    NULL,
    NULL,
    NULL,
    v_started_at,
    1
  )
  RETURNING * INTO v_run;

  PERFORM public.record_audit_log_tx(
    'business', v_business_id, 'ai.workflow.executed',
    'workflow-engine', 'ai_agent', 'workflow_run', v_run.id::TEXT, 'success',
    jsonb_build_object('run_id', v_run.id::TEXT, 'node_count', 0),
    auth.uid()::TEXT, 'user', NULL, NULL, NULL,
    NULL, NULL, NULL, p_workflow_id::TEXT, NULL, 1
  );

  RETURN to_jsonb(v_run);
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_decide_run_with_audit(
  p_workflow_id UUID,
  p_run_id UUID,
  p_approved BOOLEAN,
  p_reason TEXT,
  p_decided_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_run public.workflow_runs;
  v_decided_at TIMESTAMPTZ := COALESCE(p_decided_at, timezone('utc'::text, now()));
  v_action TEXT;
  v_metadata JSONB;
  v_reason TEXT := NULLIF(left(trim(COALESCE(p_reason, '')), 1024), '');
  v_initiator_id TEXT;
  v_next_context JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_AUTH_REQUIRED';
  END IF;

  SELECT r.business_id
  INTO v_business_id
  FROM public.workflow_runs r
  JOIN public.automation_workflows w
    ON w.id = r.workflow_id
   AND w.business_id = r.business_id
  JOIN public.businesses b ON b.id = r.business_id
  WHERE r.id = p_run_id
    AND r.workflow_id = p_workflow_id
    AND b.owner_id = auth.uid()
  FOR UPDATE OF r;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_RUN_NOT_OWNED';
  END IF;

  SELECT r.* INTO v_run
  FROM public.workflow_runs r
  WHERE r.id = p_run_id;

  IF v_run.status <> 'AWAITING_APPROVAL' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORKFLOW_RUN_NOT_AWAITING_APPROVAL';
  END IF;

  v_initiator_id := COALESCE(v_run.context_data #>> '{_workflow,initiator_id}', auth.uid()::TEXT);
  v_next_context := jsonb_set(
    COALESCE(v_run.context_data, '{}'::JSONB),
    '{_workflow,approval}',
    jsonb_build_object(
      'approved', p_approved,
      'approver_id', auth.uid()::TEXT,
      'approver_type', 'user',
      'decided_at', v_decided_at,
      'reason', v_reason
    ),
    true
  );

  IF p_approved THEN
    v_action := 'ai.workflow.approved';
    v_metadata := jsonb_build_object(
      'workflow_id', p_workflow_id::TEXT,
      'run_id', p_run_id::TEXT,
      'node_id', v_run.current_node_id
    );

    UPDATE public.workflow_runs
    SET status = 'RUNNING',
        context_data = v_next_context,
        approved_by = auth.uid(),
        approval_decided_at = v_decided_at,
        approval_reason = v_reason,
        run_version = run_version + 1,
        last_step_at = v_decided_at
    WHERE id = p_run_id;
  ELSE
    v_action := 'ai.workflow.rejected';
    v_metadata := jsonb_build_object(
      'workflow_id', p_workflow_id::TEXT,
      'run_id', p_run_id::TEXT,
      'node_id', v_run.current_node_id,
      'reason_code', 'owner_rejected'
    );

    UPDATE public.workflow_runs
    SET status = 'CANCELLED',
        context_data = v_next_context,
        error_details = jsonb_set(
          COALESCE(error_details, '{}'::JSONB),
          '{rejection_reason}',
          to_jsonb(COALESCE(v_reason, 'Rejected by business owner')),
          true
        ),
        approved_by = auth.uid(),
        approval_decided_at = v_decided_at,
        approval_reason = v_reason,
        completed_at = v_decided_at,
        run_version = run_version + 1,
        last_step_at = v_decided_at
    WHERE id = p_run_id;
  END IF;

  PERFORM public.record_audit_log_tx(
    'business', v_business_id, v_action,
    auth.uid()::TEXT, 'user', 'workflow_run', p_run_id::TEXT, 'success',
    v_metadata,
    v_initiator_id, 'user', auth.uid()::TEXT, 'user', v_decided_at,
    NULL, NULL, NULL, p_workflow_id::TEXT, NULL, 1
  );

  SELECT * INTO v_run FROM public.workflow_runs WHERE id = p_run_id;
  RETURN to_jsonb(v_run);
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_update_run_with_audit(
  p_workflow_id UUID,
  p_run_id UUID,
  p_status TEXT,
  p_current_node_id TEXT,
  p_context_data JSONB,
  p_error_details JSONB,
  p_completed_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_run public.workflow_runs;
  v_action TEXT;
  v_metadata JSONB;
  v_status TEXT;
  v_node_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_AUTH_REQUIRED';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_RUN_STATUS_INVALID';
  END IF;
  IF p_context_data IS NOT NULL AND jsonb_typeof(p_context_data) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_CONTEXT_INVALID';
  END IF;
  IF p_error_details IS NOT NULL AND jsonb_typeof(p_error_details) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_ERROR_DETAILS_INVALID';
  END IF;

  SELECT r.business_id
  INTO v_business_id
  FROM public.workflow_runs r
  JOIN public.automation_workflows w
    ON w.id = r.workflow_id
   AND w.business_id = r.business_id
  JOIN public.businesses b ON b.id = r.business_id
  WHERE r.id = p_run_id
    AND r.workflow_id = p_workflow_id
    AND b.owner_id = auth.uid()
  FOR UPDATE OF r;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_RUN_NOT_OWNED';
  END IF;

  SELECT * INTO v_run FROM public.workflow_runs WHERE id = p_run_id;
  IF v_run.status = 'AWAITING_APPROVAL' AND p_status IN ('RUNNING', 'COMPLETED') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_APPROVAL_RPC_REQUIRED';
  END IF;

  UPDATE public.workflow_runs
  SET status = COALESCE(p_status, status),
      current_node_id = COALESCE(p_current_node_id, current_node_id),
      context_data = COALESCE(p_context_data, context_data),
      error_details = COALESCE(p_error_details, error_details),
      completed_at = COALESCE(p_completed_at, completed_at),
      last_step_at = timezone('utc'::text, now()),
      run_version = run_version + 1
  WHERE id = p_run_id;

  SELECT * INTO v_run FROM public.workflow_runs WHERE id = p_run_id;
  v_status := v_run.status;
  v_node_id := COALESCE(v_run.current_node_id, v_run.error_details ->> 'failed_node_id');

  IF v_status = 'FAILED' THEN
    v_action := 'ai.workflow.failed';
    v_metadata := jsonb_build_object(
      'workflow_id', p_workflow_id::TEXT,
      'run_id', p_run_id::TEXT,
      'node_id', v_node_id,
      'reason_code', 'step_failed'
    );
  ELSE
    v_action := 'ai.workflow.executed';
    v_metadata := jsonb_build_object('run_id', p_run_id::TEXT, 'node_count', 0);
  END IF;

  PERFORM public.record_audit_log_tx(
    'business', v_business_id, v_action,
    'workflow-engine', 'ai_agent', 'workflow_run', p_run_id::TEXT,
    CASE WHEN v_status = 'FAILED' THEN 'failure' ELSE 'success' END,
    v_metadata,
    auth.uid()::TEXT, 'user', NULL, NULL, NULL,
    CASE WHEN v_status = 'FAILED' THEN 'WORKFLOW_STEP_FAILED' ELSE NULL END,
    NULL, NULL, p_workflow_id::TEXT, NULL, 1
  );

  RETURN to_jsonb(v_run);
END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_record_step_with_audit(
  p_workflow_id UUID,
  p_run_id UUID,
  p_step_id UUID,
  p_node_id TEXT,
  p_node_type TEXT,
  p_capability TEXT,
  p_status TEXT,
  p_idempotency_key TEXT,
  p_input_payload JSONB,
  p_output_payload JSONB,
  p_execution_duration_ms INTEGER,
  p_executed_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_step public.workflow_step_logs;
  v_run public.workflow_runs;
  v_action TEXT;
  v_result_status TEXT;
  v_metadata JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_AUTH_REQUIRED';
  END IF;
  IF p_status NOT IN ('PENDING', 'EXECUTING', 'SUCCESS', 'FAILED', 'SKIPPED', 'PAUSED_FOR_APPROVAL') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_STEP_STATUS_INVALID';
  END IF;
  IF p_input_payload IS NOT NULL AND jsonb_typeof(p_input_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_STEP_INPUT_INVALID';
  END IF;
  IF p_output_payload IS NOT NULL AND jsonb_typeof(p_output_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_STEP_OUTPUT_INVALID';
  END IF;

  SELECT r.* INTO v_run
  FROM public.workflow_runs r
  JOIN public.automation_workflows w
    ON w.id = r.workflow_id
   AND w.business_id = r.business_id
  JOIN public.businesses b ON b.id = r.business_id
  WHERE r.id = p_run_id
    AND r.workflow_id = p_workflow_id
    AND b.owner_id = auth.uid()
  FOR UPDATE OF r;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_RUN_NOT_OWNED';
  END IF;

  IF p_step_id IS NULL THEN
    IF NULLIF(trim(COALESCE(p_node_id, '')), '') IS NULL
       OR NULLIF(trim(COALESCE(p_node_type, '')), '') IS NULL
       OR NULLIF(trim(COALESCE(p_capability, '')), '') IS NULL
       OR NULLIF(trim(COALESCE(p_idempotency_key, '')), '') IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WORKFLOW_STEP_INPUT_REQUIRED';
    END IF;

    INSERT INTO public.workflow_step_logs (
      run_id, workflow_id, business_id, node_id, node_type, capability,
      status, idempotency_key, input_payload, output_payload,
      retry_count, execution_duration_ms, executed_at, started_at, completed_at
    ) VALUES (
      p_run_id, p_workflow_id, v_run.business_id, p_node_id, p_node_type, p_capability,
      p_status, p_idempotency_key, COALESCE(p_input_payload, '{}'::JSONB),
      COALESCE(p_output_payload, '{}'::JSONB), 0, p_execution_duration_ms,
      COALESCE(p_executed_at, timezone('utc'::text, now())),
      CASE WHEN p_status = 'PENDING' THEN NULL ELSE COALESCE(p_executed_at, timezone('utc'::text, now())) END,
      CASE WHEN p_status IN ('SUCCESS', 'FAILED', 'SKIPPED') THEN COALESCE(p_executed_at, timezone('utc'::text, now())) ELSE NULL END
    )
    RETURNING * INTO v_step;
  ELSE
    SELECT s.* INTO v_step
    FROM public.workflow_step_logs s
    WHERE s.id = p_step_id
      AND s.run_id = p_run_id
      AND s.workflow_id = p_workflow_id
      AND s.business_id = v_run.business_id
    FOR UPDATE;

    IF v_step.id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKFLOW_STEP_NOT_OWNED';
    END IF;
    IF v_step.status NOT IN ('PENDING', 'EXECUTING', 'PAUSED_FOR_APPROVAL') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORKFLOW_STEP_ALREADY_FINAL';
    END IF;

    UPDATE public.workflow_step_logs
    SET status = p_status,
        input_payload = COALESCE(p_input_payload, input_payload),
        output_payload = COALESCE(p_output_payload, output_payload),
        execution_duration_ms = COALESCE(p_execution_duration_ms, execution_duration_ms),
        executed_at = COALESCE(p_executed_at, executed_at),
        started_at = COALESCE(started_at, p_executed_at, timezone('utc'::text, now())),
        completed_at = CASE
          WHEN p_status IN ('SUCCESS', 'FAILED', 'SKIPPED') THEN COALESCE(p_executed_at, timezone('utc'::text, now()))
          ELSE completed_at
        END
    WHERE id = p_step_id;

    SELECT * INTO v_step FROM public.workflow_step_logs WHERE id = p_step_id;
  END IF;

  v_result_status := NULLIF(v_step.output_payload ->> 'result_status', '');
  IF v_result_status = 'SIMULATED' THEN
    v_action := 'ai.workflow.step_simulated';
  ELSIF v_result_status = 'UNSUPPORTED' OR v_step.status = 'SKIPPED' THEN
    v_action := 'ai.workflow.step_unsupported';
  ELSIF v_result_status = 'FAILED' OR v_step.status = 'FAILED' THEN
    v_action := 'ai.workflow.step_failed';
  ELSIF v_result_status = 'SUCCESS' OR v_step.status = 'SUCCESS' THEN
    v_action := 'ai.workflow.step_succeeded';
  ELSE
    v_action := 'ai.workflow.executed';
  END IF;

  IF v_action = 'ai.workflow.executed' THEN
    v_metadata := jsonb_build_object('run_id', p_run_id::TEXT, 'node_count', 0);
  ELSE
    v_metadata := jsonb_build_object(
      'workflow_id', p_workflow_id::TEXT,
      'run_id', p_run_id::TEXT,
      'node_id', v_step.node_id,
      'capability', v_step.capability,
      'result_status', COALESCE(v_result_status, v_step.status)
    );
  END IF;
  IF v_action = 'ai.workflow.step_failed' OR v_action = 'ai.workflow.step_unsupported' THEN
    v_metadata := v_metadata || jsonb_build_object('reason_code', CASE WHEN v_action = 'ai.workflow.step_failed' THEN 'step_failed' ELSE 'unsupported_capability' END);
  END IF;

  PERFORM public.record_audit_log_tx(
    'business', v_business_id, v_action,
    'workflow-engine', 'ai_agent', 'workflow_step', v_step.id::TEXT,
    CASE WHEN v_action = 'ai.workflow.step_failed' THEN 'failure' ELSE 'success' END,
    v_metadata,
    auth.uid()::TEXT, 'user', NULL, NULL, NULL,
    CASE WHEN v_action = 'ai.workflow.step_failed' THEN 'WORKFLOW_STEP_FAILED' ELSE NULL END,
    NULL, NULL, p_workflow_id::TEXT, NULL, 1
  );

  RETURN to_jsonb(v_step);
END;
$$;

REVOKE ALL ON FUNCTION public.workflow_create_run_with_audit(UUID, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.workflow_decide_run_with_audit(UUID, UUID, BOOLEAN, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.workflow_update_run_with_audit(UUID, UUID, TEXT, TEXT, JSONB, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.workflow_record_step_with_audit(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.workflow_create_run_with_audit(UUID, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_decide_run_with_audit(UUID, UUID, BOOLEAN, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_update_run_with_audit(UUID, UUID, TEXT, TEXT, JSONB, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_record_step_with_audit(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, TIMESTAMPTZ) TO authenticated;
