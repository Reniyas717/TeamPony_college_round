-- Owner-triggered processing must claim only that owner's business jobs.
CREATE OR REPLACE FUNCTION public.claim_webinar_email_jobs_for_business(
  p_business_id UUID, p_worker_id TEXT, p_limit INTEGER DEFAULT 25,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.webinar_email_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  bounded_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 50);
  bounded_lease INTEGER := LEAST(GREATEST(COALESCE(p_lease_seconds, 300), 30), 900);
BEGIN
  IF p_business_id IS NULL THEN RAISE EXCEPTION 'business id is required'; END IF;
  IF p_worker_id IS NULL OR length(trim(p_worker_id)) = 0 THEN RAISE EXCEPTION 'worker id is required'; END IF;

  UPDATE public.webinar_email_outbox
  SET status = 'unknown', unknown_since = COALESCE(unknown_since, now()),
      lease_owner = NULL, lease_expires_at = NULL,
      last_error = 'Previous worker lease expired; held for reconciliation.'
  WHERE business_id = p_business_id AND status = 'processing'
    AND lease_expires_at IS NOT NULL AND lease_expires_at < now();

  RETURN QUERY
  WITH locked AS (
    SELECT id FROM public.webinar_email_outbox
    WHERE business_id = p_business_id AND status IN ('queued', 'failed')
      AND scheduled_for <= now() AND next_attempt_at <= now()
      AND attempt_count < max_attempts
    ORDER BY scheduled_for, id FOR UPDATE SKIP LOCKED LIMIT bounded_limit
  ), claimed AS (
    UPDATE public.webinar_email_outbox o
    SET status = 'processing', attempt_count = o.attempt_count + 1,
        lease_owner = p_worker_id,
        lease_expires_at = now() + make_interval(secs => bounded_lease),
        next_attempt_at = now()
    FROM locked WHERE o.id = locked.id RETURNING o.*
  ) SELECT * FROM claimed ORDER BY scheduled_for, id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webinar_email_jobs_for_business(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webinar_email_jobs_for_business(UUID, TEXT, INTEGER, INTEGER) TO service_role;
