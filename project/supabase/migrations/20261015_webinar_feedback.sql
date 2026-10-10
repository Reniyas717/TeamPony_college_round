-- Public webinar feedback. The raw 32-byte base64url token never enters the
-- database; trusted message producers store only its SHA-256 hex digest.

CREATE TABLE IF NOT EXISTS public.webinar_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL,
  webinar_id UUID NOT NULL,
  token_hash TEXT NOT NULL CHECK (
    token_hash = lower(token_hash)
    AND token_hash ~ '^[0-9a-f]{64}$'
  ),
  rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  was_useful BOOLEAN,
  comments TEXT CHECK (comments IS NULL OR length(comments) <= 2000),
  product_interest BOOLEAN NOT NULL DEFAULT false,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (business_id, registration_id, webinar_id),
  UNIQUE (business_id, token_hash),
  FOREIGN KEY (business_id, registration_id, webinar_id)
    REFERENCES public.webinar_registration_sessions(business_id, registration_id, webinar_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webinar_feedback_webinar_idx
  ON public.webinar_feedback(business_id, webinar_id);

ALTER TABLE public.webinar_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read webinar feedback" ON public.webinar_feedback;
CREATE POLICY "Owners can read webinar feedback"
  ON public.webinar_feedback FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

REVOKE ALL ON TABLE public.webinar_feedback FROM anon, public;
GRANT SELECT ON TABLE public.webinar_feedback TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_webinar_feedback_form(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target RECORD;
BEGIN
  SELECT
    f.id,
    f.rating,
    f.was_useful,
    f.comments,
    f.product_interest,
    f.marketing_opt_in,
    f.submitted_at,
    w.title,
    w.description,
    w.scheduled_start,
    w.duration_minutes,
    w.timezone,
    w.product_url,
    w.status
  INTO target
  FROM public.webinar_feedback f
  JOIN public.webinars w
    ON w.business_id = f.business_id
   AND w.id = f.webinar_id
  WHERE f.token_hash = lower(trim(p_token_hash))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FEEDBACK_NOT_FOUND';
  END IF;

  IF target.status = 'cancelled'
     OR target.scheduled_start IS NULL
     OR (
       target.status <> 'completed'
       AND now() < target.scheduled_start + make_interval(mins => target.duration_minutes)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FEEDBACK_NOT_AVAILABLE';
  END IF;

  RETURN jsonb_build_object(
    'session', jsonb_build_object(
      'title', target.title,
      'description', target.description,
      'scheduled_start', target.scheduled_start,
      'duration_minutes', target.duration_minutes,
      'timezone', target.timezone,
      'product_url', target.product_url
    ),
    'response', CASE WHEN target.submitted_at IS NULL THEN NULL ELSE jsonb_build_object(
      'rating', target.rating,
      'was_useful', target.was_useful,
      'comments', target.comments,
      'product_interest', target.product_interest,
      'marketing_opt_in', target.marketing_opt_in,
      'submitted_at', target.submitted_at
    ) END
  );
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
  target RECORD;
  normalized_comments TEXT;
  submitted_at_value TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 OR p_was_useful IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_FEEDBACK';
  END IF;

  normalized_comments := NULLIF(trim(coalesce(p_comments, '')), '');
  IF normalized_comments IS NOT NULL AND length(normalized_comments) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_FEEDBACK';
  END IF;

  SELECT
    f.id,
    f.business_id,
    f.registration_id,
    f.webinar_id,
    r.email,
    w.scheduled_start,
    w.duration_minutes,
    w.status
  INTO target
  FROM public.webinar_feedback f
  JOIN public.webinar_registrations r
    ON r.business_id = f.business_id
   AND r.id = f.registration_id
  JOIN public.webinars w
    ON w.business_id = f.business_id
   AND w.id = f.webinar_id
  WHERE f.token_hash = lower(trim(p_token_hash))
  FOR UPDATE OF f;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FEEDBACK_NOT_FOUND';
  END IF;

  IF target.status = 'cancelled'
     OR target.scheduled_start IS NULL
     OR (
       target.status <> 'completed'
       AND now() < target.scheduled_start + make_interval(mins => target.duration_minutes)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FEEDBACK_NOT_AVAILABLE';
  END IF;

  UPDATE public.webinar_feedback
  SET rating = p_rating,
      was_useful = p_was_useful,
      comments = normalized_comments,
      product_interest = coalesce(p_product_interest, false),
      marketing_opt_in = coalesce(p_marketing_opt_in, false),
      submitted_at = submitted_at_value,
      updated_at = submitted_at_value
  WHERE id = target.id
    AND business_id = target.business_id;

  -- Feedback consent is independent of this response. A later unchecked
  -- box never withdraws an earlier affirmative consent record.
  IF coalesce(p_marketing_opt_in, false) THEN
    INSERT INTO public.business_marketing_consents (
      business_id, email, normalized_email
    )
    VALUES (
      target.business_id,
      target.email,
      lower(trim(target.email))
    )
    ON CONFLICT (business_id, normalized_email)
    DO UPDATE SET updated_at = submitted_at_value;
  END IF;

  RETURN jsonb_build_object(
    'submitted_at', submitted_at_value,
    'product_interest', coalesce(p_product_interest, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_webinar_feedback_form(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_webinar_feedback(TEXT, INTEGER, BOOLEAN, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_webinar_feedback_form(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_webinar_feedback(TEXT, INTEGER, BOOLEAN, TEXT, BOOLEAN, BOOLEAN) TO anon, authenticated;
