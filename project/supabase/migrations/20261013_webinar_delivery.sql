-- Durable webinar email delivery. This migration is standalone and additive.
-- Application code owns the message payload; this table owns delivery state.

CREATE TABLE IF NOT EXISTS public.webinar_email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_id UUID REFERENCES public.webinars(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'registration_confirmation', 'reschedule_notification', 'cancellation_notification',
    'followup_attendee', 'followup_no_show'
  )),
  effect_key TEXT NOT NULL UNIQUE CHECK (length(trim(effect_key)) BETWEEN 1 AND 240),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 240),
  to_email TEXT NOT NULL CHECK (length(trim(to_email)) BETWEEN 3 AND 320),
  from_email TEXT NOT NULL CHECK (length(trim(from_email)) BETWEEN 3 AND 320),
  reply_to_email TEXT CHECK (reply_to_email IS NULL OR length(trim(reply_to_email)) BETWEEN 3 AND 320),
  subject TEXT NOT NULL CHECK (length(trim(subject)) BETWEEN 1 AND 998),
  html_body TEXT NOT NULL CHECK (length(html_body) <= 1000000),
  text_body TEXT CHECK (text_body IS NULL OR length(text_body) <= 1000000),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'processing', 'provider_accepted', 'failed', 'unknown', 'blocked', 'cancelled'
  )),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  provider_id TEXT,
  provider_accepted_at TIMESTAMPTZ,
  unknown_since TIMESTAMPTZ,
  last_error TEXT CHECK (last_error IS NULL OR length(last_error) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webinar_email_outbox_provider_acceptance_consistent CHECK (
    status <> 'provider_accepted' OR provider_id IS NOT NULL
  ),
  CONSTRAINT webinar_email_outbox_unknown_consistent CHECK (
    status <> 'unknown' OR unknown_since IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS webinar_email_outbox_due_idx
  ON public.webinar_email_outbox (next_attempt_at, scheduled_for, id)
  WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS webinar_email_outbox_business_idx
  ON public.webinar_email_outbox (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webinar_email_outbox_webinar_idx
  ON public.webinar_email_outbox (webinar_id, created_at DESC);

ALTER TABLE public.webinar_email_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can read webinar email outcomes" ON public.webinar_email_outbox;
CREATE POLICY "Owners can read webinar email outcomes"
  ON public.webinar_email_outbox FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
REVOKE ALL ON TABLE public.webinar_email_outbox FROM anon, public;
GRANT SELECT ON TABLE public.webinar_email_outbox TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_webinar_email_outbox()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS webinar_email_outbox_touch ON public.webinar_email_outbox;
CREATE TRIGGER webinar_email_outbox_touch BEFORE UPDATE ON public.webinar_email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.touch_webinar_email_outbox();

CREATE OR REPLACE FUNCTION public.prevent_webinar_email_payload_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.webinar_id IS DISTINCT FROM OLD.webinar_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.effect_key IS DISTINCT FROM OLD.effect_key
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.to_email IS DISTINCT FROM OLD.to_email
     OR NEW.from_email IS DISTINCT FROM OLD.from_email
     OR NEW.reply_to_email IS DISTINCT FROM OLD.reply_to_email
     OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.html_body IS DISTINCT FROM OLD.html_body
     OR NEW.text_body IS DISTINCT FROM OLD.text_body
     OR NEW.payload IS DISTINCT FROM OLD.payload THEN
    RAISE EXCEPTION 'webinar email payload is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS webinar_email_outbox_immutable_payload ON public.webinar_email_outbox;
CREATE TRIGGER webinar_email_outbox_immutable_payload BEFORE UPDATE ON public.webinar_email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.prevent_webinar_email_payload_mutation();

-- Stable effect keys make retries and producer retries return one logical row.
CREATE OR REPLACE FUNCTION public.enqueue_webinar_email(
  p_business_id UUID, p_webinar_id UUID, p_kind TEXT, p_effect_key TEXT,
  p_to_email TEXT, p_from_email TEXT, p_reply_to_email TEXT, p_subject TEXT,
  p_html_body TEXT, p_text_body TEXT, p_payload JSONB DEFAULT '{}'::jsonb,
  p_scheduled_for TIMESTAMPTZ DEFAULT now(), p_max_attempts INTEGER DEFAULT 5
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE queued_id UUID;
BEGIN
  IF p_webinar_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.webinars WHERE id = p_webinar_id AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'webinar does not belong to business';
  END IF;
  INSERT INTO public.webinar_email_outbox (
    business_id, webinar_id, kind, effect_key, idempotency_key,
    to_email, from_email, reply_to_email, subject, html_body, text_body,
    payload, scheduled_for, next_attempt_at, max_attempts
  ) VALUES (
    p_business_id, p_webinar_id, p_kind, p_effect_key, p_effect_key,
    lower(trim(p_to_email)), lower(trim(p_from_email)), lower(trim(p_reply_to_email)),
    p_subject, p_html_body, p_text_body, COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_scheduled_for, now()), COALESCE(p_scheduled_for, now()), p_max_attempts
  ) ON CONFLICT (effect_key) DO NOTHING RETURNING id INTO queued_id;
  IF queued_id IS NULL THEN
    SELECT id INTO queued_id FROM public.webinar_email_outbox WHERE effect_key = p_effect_key;
  END IF;
  RETURN queued_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_webinar_email(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_webinar_email(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, INTEGER) TO service_role;

-- Claiming is bounded and transactional. Expired processing leases become
-- unknown before new work is selected, preventing ambiguous duplicate sends.
CREATE OR REPLACE FUNCTION public.claim_webinar_email_jobs(
  p_worker_id TEXT, p_limit INTEGER DEFAULT 25, p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.webinar_email_outbox LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  bounded_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 50);
  bounded_lease INTEGER := LEAST(GREATEST(COALESCE(p_lease_seconds, 300), 30), 900);
BEGIN
  IF p_worker_id IS NULL OR length(trim(p_worker_id)) = 0 THEN RAISE EXCEPTION 'worker id is required'; END IF;
  UPDATE public.webinar_email_outbox
  SET status = 'unknown', unknown_since = COALESCE(unknown_since, now()),
      lease_owner = NULL, lease_expires_at = NULL,
      last_error = 'Previous worker lease expired; held for reconciliation.'
  WHERE status = 'processing' AND lease_expires_at IS NOT NULL AND lease_expires_at < now();
  RETURN QUERY
  WITH locked AS (
    SELECT id FROM public.webinar_email_outbox
    WHERE status IN ('queued', 'failed') AND scheduled_for <= now()
      AND next_attempt_at <= now() AND attempt_count < max_attempts
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

CREATE OR REPLACE FUNCTION public.mark_webinar_email_provider_accepted(
  p_job_id UUID, p_worker_id TEXT, p_provider_id TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.webinar_email_outbox
  SET status = 'provider_accepted', provider_id = NULLIF(trim(p_provider_id), ''),
      provider_accepted_at = now(), lease_owner = NULL, lease_expires_at = NULL, last_error = NULL
  WHERE id = p_job_id AND status = 'processing' AND lease_owner = p_worker_id
    AND p_provider_id IS NOT NULL AND length(trim(p_provider_id)) > 0;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_webinar_email_failed(
  p_job_id UUID, p_worker_id TEXT, p_safe_error TEXT, p_retryable BOOLEAN DEFAULT true
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE current_job public.webinar_email_outbox%ROWTYPE;
BEGIN
  SELECT * INTO current_job FROM public.webinar_email_outbox
  WHERE id = p_job_id AND status = 'processing' AND lease_owner = p_worker_id FOR UPDATE;
  IF current_job.id IS NULL THEN RETURN false; END IF;
  UPDATE public.webinar_email_outbox
  SET status = 'failed',
      next_attempt_at = CASE WHEN p_retryable AND current_job.attempt_count < current_job.max_attempts
        THEN now() + make_interval(secs => LEAST(3600, 30 * (2 ^ GREATEST(current_job.attempt_count - 1, 0))))
        ELSE now() END,
      lease_owner = NULL, lease_expires_at = NULL,
      last_error = left(COALESCE(NULLIF(trim(p_safe_error), ''), 'Email delivery failed.'), 1000)
  WHERE id = current_job.id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_webinar_email_unknown(
  p_job_id UUID, p_worker_id TEXT, p_safe_error TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.webinar_email_outbox
  SET status = 'unknown', unknown_since = COALESCE(unknown_since, now()),
      lease_owner = NULL, lease_expires_at = NULL,
      last_error = left(COALESCE(NULLIF(trim(p_safe_error), ''), 'Provider outcome is unknown; reconciliation is required.'), 1000)
  WHERE id = p_job_id AND status = 'processing' AND lease_owner = p_worker_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webinar_email_jobs(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_webinar_email_provider_accepted(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_webinar_email_failed(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_webinar_email_unknown(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_webinar_email_jobs(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webinar_email_provider_accepted(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webinar_email_failed(UUID, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webinar_email_unknown(UUID, TEXT, TEXT) TO service_role;
