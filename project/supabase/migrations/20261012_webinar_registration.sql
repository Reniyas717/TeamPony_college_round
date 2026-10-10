-- Public webinar registration slice.
-- This migration is additive and leaves the owner webinar schema untouched.

-- Existing rows created before public registration receive a stable fallback slug.
UPDATE public.webinars
SET public_slug = id::text
WHERE public_slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS webinars_business_id_id_key
  ON public.webinars(business_id, id);

-- The canonical CRM table is the one from 20261010_initial_schema.sql.
-- Refuse to add a normalized unique index while duplicate contacts exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.crm_contacts
    GROUP BY business_id, lower(trim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate CRM contacts exist for a business and normalized email; resolve them before webinar registration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_business_normalized_email_key
  ON public.crm_contacts(business_id, lower(trim(email)));
CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_business_id_id_key
  ON public.crm_contacts(business_id, id);

CREATE TABLE IF NOT EXISTS public.webinar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_series_id UUID,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 180),
  email TEXT NOT NULL CHECK (length(trim(email)) BETWEEN 3 AND 320),
  normalized_email TEXT NOT NULL CHECK (normalized_email = lower(trim(normalized_email))),
  contact_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, webinar_series_id)
    REFERENCES public.webinar_series(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, contact_id)
    REFERENCES public.crm_contacts(business_id, id) ON DELETE SET NULL (contact_id)
);

CREATE INDEX IF NOT EXISTS webinar_registrations_email_idx
  ON public.webinar_registrations(business_id, normalized_email);
CREATE INDEX IF NOT EXISTS webinar_registrations_series_idx
  ON public.webinar_registrations(business_id, webinar_series_id);

CREATE TABLE IF NOT EXISTS public.webinar_registration_sessions (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL,
  webinar_id UUID NOT NULL,
  normalized_email TEXT NOT NULL CHECK (normalized_email = lower(trim(normalized_email))),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (business_id, registration_id, webinar_id),
  UNIQUE (business_id, webinar_id, normalized_email),
  FOREIGN KEY (business_id, registration_id)
    REFERENCES public.webinar_registrations(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, webinar_id)
    REFERENCES public.webinars(business_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webinar_registration_sessions_webinar_idx
  ON public.webinar_registration_sessions(business_id, webinar_id);

CREATE TABLE IF NOT EXISTS public.webinar_registration_marketing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (business_id, registration_id),
  FOREIGN KEY (business_id, registration_id)
    REFERENCES public.webinar_registrations(business_id, id) ON DELETE CASCADE
);

-- Accepted consent survives webinar and registration deletion. It is owned by
-- the business and email, with deletion only when the business itself is deleted.
CREATE TABLE IF NOT EXISTS public.business_marketing_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (length(trim(email)) BETWEEN 3 AND 320),
  normalized_email TEXT NOT NULL CHECK (normalized_email = lower(trim(normalized_email))),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (business_id, normalized_email)
);

CREATE INDEX IF NOT EXISTS business_marketing_consents_business_idx
  ON public.business_marketing_consents(business_id);

CREATE OR REPLACE FUNCTION public.remove_empty_webinar_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM public.webinar_registrations r
  WHERE r.business_id = OLD.business_id
    AND r.id = OLD.registration_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.webinar_registration_sessions rs
      WHERE rs.business_id = OLD.business_id
        AND rs.registration_id = OLD.registration_id
    );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS webinar_registration_cleanup ON public.webinar_registration_sessions;
CREATE TRIGGER webinar_registration_cleanup
  AFTER DELETE ON public.webinar_registration_sessions
  FOR EACH ROW EXECUTE FUNCTION public.remove_empty_webinar_registration();

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_registration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_registration_marketing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_marketing_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can access webinar registrations" ON public.webinar_registrations;
DROP POLICY IF EXISTS "Owners can read webinar registrations" ON public.webinar_registrations;
CREATE POLICY "Owners can read webinar registrations"
  ON public.webinar_registrations FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can access webinar registration sessions" ON public.webinar_registration_sessions;
DROP POLICY IF EXISTS "Owners can read webinar registration sessions" ON public.webinar_registration_sessions;
CREATE POLICY "Owners can read webinar registration sessions"
  ON public.webinar_registration_sessions FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can access webinar marketing preferences" ON public.webinar_registration_marketing_preferences;
DROP POLICY IF EXISTS "Owners can read webinar marketing preferences" ON public.webinar_registration_marketing_preferences;
CREATE POLICY "Owners can read webinar marketing preferences"
  ON public.webinar_registration_marketing_preferences FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can read business marketing consents" ON public.business_marketing_consents;
CREATE POLICY "Owners can read business marketing consents"
  ON public.business_marketing_consents FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- The public surface is function-only. Owners retain RLS-governed access to these tables.
REVOKE ALL ON TABLE public.webinar_registrations,
  public.webinar_registration_sessions,
  public.webinar_registration_marketing_preferences,
  public.business_marketing_consents FROM anon, public;
GRANT SELECT ON TABLE public.webinar_registrations,
  public.webinar_registration_sessions,
  public.webinar_registration_marketing_preferences,
  public.business_marketing_consents TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_webinar_registration_form(p_public_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_webinar public.webinars%ROWTYPE;
  target_series public.webinar_series%ROWTYPE;
  result JSONB;
BEGIN
  SELECT w.*
  INTO target_webinar
  FROM public.webinars w
  WHERE lower(w.public_slug) = lower(trim(p_public_slug))
    AND w.status IN ('scheduled', 'live') AND w.provisioning_status = 'ready' AND w.meeting_uri IS NOT NULL
  LIMIT 1;

  IF target_webinar.id IS NOT NULL AND target_webinar.series_id IS NULL THEN
    SELECT jsonb_build_object(
      'kind', 'session',
      'slug', target_webinar.public_slug,
      'title', target_webinar.title,
      'description', target_webinar.description,
      'sessions', jsonb_build_array(jsonb_build_object(
        'slug', target_webinar.public_slug,
        'title', target_webinar.title,
        'description', target_webinar.description,
        'scheduled_start', target_webinar.scheduled_start,
        'duration_minutes', target_webinar.duration_minutes,
        'timezone', target_webinar.timezone,
        'capacity', target_webinar.capacity,
        'remaining_capacity', CASE
          WHEN target_webinar.capacity IS NULL THEN NULL
          ELSE greatest(target_webinar.capacity - (
            SELECT count(*)::INTEGER
            FROM public.webinar_registration_sessions rs
            WHERE rs.business_id = target_webinar.business_id
              AND rs.webinar_id = target_webinar.id
          ), 0)
        END,
        'registration_closes_at', target_webinar.registration_closes_at
      ))
    ) INTO result;
    RETURN result;
  END IF;

  IF target_webinar.id IS NOT NULL AND target_webinar.series_id IS NOT NULL THEN
    SELECT s.* INTO target_series
    FROM public.webinar_series s
    WHERE s.id = target_webinar.series_id;
  ELSE
    SELECT s.* INTO target_series
    FROM public.webinar_series s
    WHERE lower(s.public_slug) = lower(trim(p_public_slug));
  END IF;

  IF target_series.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WEBINAR_NOT_FOUND';
  END IF;

  SELECT jsonb_build_object(
    'kind', 'series',
    'slug', target_series.public_slug,
    'title', target_series.title,
    'description', target_series.description,
    'sessions', COALESCE(jsonb_agg(jsonb_build_object(
      'slug', w.public_slug,
      'title', w.title,
      'description', w.description,
      'scheduled_start', w.scheduled_start,
      'duration_minutes', w.duration_minutes,
      'timezone', w.timezone,
      'capacity', w.capacity,
      'remaining_capacity', CASE
        WHEN w.capacity IS NULL THEN NULL
        ELSE greatest(w.capacity - (
          SELECT count(*)::INTEGER
          FROM public.webinar_registration_sessions rs
          WHERE rs.business_id = w.business_id
            AND rs.webinar_id = w.id
        ), 0)
      END,
      'registration_closes_at', w.registration_closes_at
    ) ORDER BY w.scheduled_start), '[]'::JSONB)
  ) INTO result
  FROM public.webinars w
  WHERE w.series_id = target_series.id
    AND w.status IN ('scheduled', 'live') AND w.provisioning_status = 'ready' AND w.meeting_uri IS NOT NULL;

  RETURN result;
END;
$$;

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
  normalized_email TEXT;
BEGIN
  trimmed_name := trim(p_full_name);
  normalized_email := lower(trim(p_email));
  IF length(trimmed_name) < 1 OR length(trimmed_name) > 180
     OR length(normalized_email) < 3 OR length(normalized_email) > 320
     OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
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
        AND rs.normalized_email = normalized_email
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DUPLICATE_REGISTRATION';
    END IF;
  END LOOP;

  SELECT c.id
  INTO matched_contact_id
  FROM public.crm_contacts c
  WHERE c.business_id = target_business_id
    AND lower(trim(c.email)) = normalized_email
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
        AND lower(trim(c.email)) = normalized_email
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.webinar_registrations (business_id, webinar_series_id, full_name, email, normalized_email, contact_id)
  VALUES (target_business_id, target_series_id, trimmed_name, trim(p_email), normalized_email, matched_contact_id)
  RETURNING id INTO registration_id;

  INSERT INTO public.webinar_registration_sessions (business_id, registration_id, webinar_id, normalized_email)
  SELECT target_business_id, registration_id, session_id, normalized_email
  FROM unnest(selected_ids) AS session_ids(session_id);

  INSERT INTO public.webinar_registration_marketing_preferences (business_id, registration_id, marketing_opt_in)
  VALUES (target_business_id, registration_id, COALESCE(p_marketing_opt_in, false));

  IF COALESCE(p_marketing_opt_in, false) THEN
    INSERT INTO public.business_marketing_consents (business_id, email, normalized_email)
    VALUES (target_business_id, trim(p_email), normalized_email)
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

REVOKE ALL ON FUNCTION public.get_public_webinar_registration_form(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_public_webinar_attendee(TEXT, TEXT, TEXT, TEXT[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_webinar_registration_form(TEXT) TO anon, authenticated;
RANT EXECUTE ON FUNCTION public.register_public_webinar_attendee(TEXT, TEXT, TEXT, TEXT[], BOOLEAN) TO anon, authenticated;
