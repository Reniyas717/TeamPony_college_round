-[PUBLIC-WEBINAR-REGISTRATION-RPC-FAILED] code=42702 message=column reference "normalized_email" is ambiguous
 POST /api/public/webinars/1a2f9bbb-84e2-4963-bd88-10ee26c767bb/registrations 500 in 1096ms (next.js: 33ms, proxy.ts: 431ms, application-code: 633ms)
 POST /api/public/webinars/1a2f9bbb-84e2-4963-bd88-10ee26c767bb/registrations 201 in 3.1s (next.js: 28ms, proxy.ts: 593ms, application-code: 2.5s)
- Claim only the newly queued registration confirmation for immediate delivery.
CREATE OR REPLACE FUNCTION public.claim_webinar_email_job_by_effect_key(
  p_effect_key TEXT,
  p_worker_id TEXT,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.webinar_email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  bounded_lease INTEGER := LEAST(GREATEST(COALESCE(p_lease_seconds, 300), 30), 900);
BEGIN
  IF p_effect_key IS NULL OR length(trim(p_effect_key)) = 0 THEN
    RAISE EXCEPTION 'email effect key is required';
  END IF;
  IF p_worker_id IS NULL OR length(trim(p_worker_id)) = 0 THEN
    RAISE EXCEPTION 'worker id is required';
  END IF;

  UPDATE public.webinar_email_outbox AS expired
  SET status = 'unknown',
      unknown_since = COALESCE(expired.unknown_since, now()),
      lease_owner = NULL,
      lease_expires_at = NULL,
      last_error = 'Previous worker lease expired; held for reconciliation.'
  WHERE expired.effect_key = p_effect_key
    AND expired.status = 'processing'
    AND expired.lease_expires_at IS NOT NULL
    AND expired.lease_expires_at < now();

  RETURN QUERY
  WITH locked AS (
    SELECT candidate.id
    FROM public.webinar_email_outbox AS candidate
    WHERE candidate.effect_key = p_effect_key
      AND candidate.status IN ('queued', 'failed')
      AND candidate.scheduled_for <= now()
      AND candidate.next_attempt_at <= now()
      AND candidate.attempt_count < candidate.max_attempts
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.webinar_email_outbox AS job
    SET status = 'processing',
        attempt_count = job.attempt_count + 1,
        lease_owner = p_worker_id,
        lease_expires_at = now() + make_interval(secs => bounded_lease),
        next_attempt_at = now()
    FROM locked
    WHERE job.id = locked.id
    RETURNING job.*
  )
  SELECT claimed.* FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webinar_email_job_by_effect_key(TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_webinar_email_job_by_effect_key(TEXT, TEXT, INTEGER)
  TO service_role;
