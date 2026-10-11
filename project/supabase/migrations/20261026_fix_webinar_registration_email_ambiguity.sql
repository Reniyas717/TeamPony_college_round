-- Fix PL/pgSQL variable/column ambiguity in public registration.
-- The atomic public RPC calls this legacy implementation within the same transaction.

CREATE OR REPLACE FUNCTION public.nexus_register_public_webinar_attendee_legacy(
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
  target_webinar public.webinars%ROWTYPE;
  target_business_id UUID;
  target_series_id UUID;
  selected_slugs TEXT[];
  selected_ids UUID[];
  selected_count INTEGER;
  registration_id UUID;
  matched_contact_id UUID;
  contact_first_name TEXT;
  contact_last_name TEXT;
  trimmed_name TEXT;
  session_row RECORD;
  v_normalized_email TEXT;
BEGIN
  trimmed_name := trim(p_full_name);
  v_normalized_email := lower(trim(p_email));
  IF length(trimmed_name) < 1 OR length(trimmed_name) > 180
     OR length(v_normalized_email) < 3 OR length(v_normalized_email) > 320
     OR v_normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_REQUEST';
  END IF;

  SELECT w.* INTO target_webinar
  FROM public.webinars w
  WHERE lower(w.public_slug) = lower(trim(p_public_slug))
    AND w.status IN ('scheduled', 'live') AND w.provisioning_status = 'ready' AND w.meeting_uri IS NOT NULL
  LIMIT 1;

  IF target_webinar.id IS NULL THEN
    SELECT w.* INTO target_webinar
    FROM public.webinars w
    JOIN public.webinar_series s ON s.id = w.series_id
    WHERE lower(s.public_slug) = lower(trim(p_public_slug))
      AND w.status IN ('scheduled', 'live') AND w.provisioning_status = 'ready' AND w.meeting_uri IS NOT NULL
    ORDER BY w.scheduled_start
    LIMIT 1;
  END IF;

  IF target_webinar.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WEBINAR_NOT_FOUND';
  END IF;

  target_business_id := target_webinar.business_id;
  target_series_id := target_webinar.series_id;
  IF target_series_id IS NULL THEN
    selected_slugs := ARRAY[lower(trim(target_webinar.public_slug))];
    IF p_selected_session_slugs IS NOT NULL
       AND (array_length(p_selected_session_slugs, 1) IS DISTINCT FROM 1
         OR lower(trim(p_selected_session_slugs[1])) <> lower(trim(target_webinar.public_slug))) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_SESSION_SELECTION';
    END IF;
  ELSE
    selected_slugs := ARRAY(
      SELECT DISTINCT lower(trim(value))
      FROM unnest(COALESCE(p_selected_session_slugs, ARRAY[]::TEXT[])) AS value
      WHERE length(trim(value)) > 0
    );
    IF COALESCE(array_length(selected_slugs, 1), 0) = 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_SESSION_SELECTION';
    END IF;
  END IF;

  selected_count := COALESCE(array_length(selected_slugs, 1), 0);
  SELECT array_agg(w.id ORDER BY w.id)
  INTO selected_ids
  FROM public.webinars w
  WHERE w.business_id = target_business_id
    AND w.series_id IS NOT DISTINCT FROM target_series_id
    AND lower(w.public_slug) = ANY(selected_slugs)
    AND w.status IN ('scheduled', 'live') AND w.provisioning_status = 'ready' AND w.meeting_uri IS NOT NULL;

  IF COALESCE(array_length(selected_ids, 1), 0) <> selected_count THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_SESSION_SELECTION';
  END IF;

  -- Lock every selected session before checking any capacity. This makes a series
  -- registration all-or-nothing under concurrent submissions.
  FOR session_row IN
    SELECT w.id, w.capacity, w.registration_closes_at, w.scheduled_start, w.status, w.provisioning_status, w.meeting_uri
    FROM public.webinars w
    WHERE w.business_id = target_business_id
      AND w.id = ANY(selected_ids)
    ORDER BY w.id
    FOR UPDATE
  LOOP
    IF session_row.status NOT IN ('scheduled', 'live') OR session_row.provisioning_status <> 'ready' OR session_row.meeting_uri IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WEBINAR_UNAVAILABLE';
    END IF;
    IF now() >= COALESCE(session_row.registration_closes_at, session_row.scheduled_start) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'REGISTRATION_CLOSED';
    END IF;
    IF session_row.capacity IS NOT NULL AND (
      SELECT count(*)
      FROM public.webinar_registration_sessions rs
      WHERE rs.business_id = target_business_id AND rs.webinar_id = session_row.id
    ) >= session_row.capacity THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CAPACITY_REACHED';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.webinar_registration_sessions rs
      WHERE rs.business_id = target_business_id
        AND rs.webinar_id = session_row.id
        AND rs.normalized_email = v_normalized_email
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DUPLICATE_REGISTRATION';
    END IF;
  END LOOP;

  SELECT c.id
  INTO matched_contact_id
  FROM public.crm_contacts c
  WHERE c.business_id = target_business_id
    AND lower(trim(c.email)) = v_normalized_email
  LIMIT 1;

  IF matched_contact_id IS NULL THEN
    contact_first_name := split_part(trimmed_name, ' ', 1);
    contact_last_name := NULLIF(trim(substr(trimmed_name, length(contact_first_name) + 1)), '');
    INSERT INTO public.crm_contacts (business_id, first_name, last_name, email, status)
    VALUES (target_business_id, contact_first_name, contact_last_name, trim(p_email), 'lead')
    ON CONFLICT DO NOTHING
    RETURNING id INTO matched_contact_id;

    IF matched_contact_id IS NULL THEN
      SELECT c.id
      INTO matched_contact_id
      FROM public.crm_contacts c
      WHERE c.business_id = target_business_id
        AND lower(trim(c.email)) = v_normalized_email
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.webinar_registrations (business_id, webinar_series_id, full_name, email, normalized_email, contact_id)
  VALUES (target_business_id, target_series_id, trimmed_name, trim(p_email), v_normalized_email, matched_contact_id)
  RETURNING id INTO registration_id;

  INSERT INTO public.webinar_registration_sessions (business_id, registration_id, webinar_id, normalized_email)
  SELECT target_business_id, registration_id, session_id, v_normalized_email
  FROM unnest(selected_ids) AS session_ids(session_id);

  INSERT INTO public.webinar_registration_marketing_preferences (business_id, registration_id, marketing_opt_in)
  VALUES (target_business_id, registration_id, COALESCE(p_marketing_opt_in, false));

  IF COALESCE(p_marketing_opt_in, false) THEN
    INSERT INTO public.business_marketing_consents (business_id, email, normalized_email)
    VALUES (target_business_id, trim(p_email), v_normalized_email)
    ON CONFLICT (business_id, normalized_email)
    DO UPDATE SET updated_at = timezone('utc'::text, now());
  END IF;

  -- Registration changes invalidate reviewed cancellation/follow-up snapshots.
  UPDATE public.webinars
  SET updated_at = timezone('utc'::text, now())
  WHERE business_id = target_business_id AND id = ANY(selected_ids);

  RETURN jsonb_build_object(
    'registration_id', registration_id,
    'contact_id', matched_contact_id,
    'session_slugs', selected_slugs,
    'marketing_opt_in', COALESCE(p_marketing_opt_in, false)
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DUPLICATE_REGISTRATION';
END;
$$;
