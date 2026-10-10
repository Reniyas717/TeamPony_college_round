-- Durable Google Meet attendance storage.
-- Provider credentials and OAuth lifecycle remain owned by the existing Google
-- integration. This migration stores only provider attendance and review data.

CREATE TABLE IF NOT EXISTS public.webinar_attendance_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'incomplete', 'complete', 'failed', 'integration_unavailable'
  )),
  checkpoint JSONB NOT NULL DEFAULT '{}'::jsonb,
  pages_fetched INTEGER NOT NULL DEFAULT 0 CHECK (pages_fetched >= 0),
  conference_count INTEGER NOT NULL DEFAULT 0 CHECK (conference_count >= 0),
  participant_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
  participant_session_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_session_count >= 0),
  unresolved_count INTEGER NOT NULL DEFAULT 0 CHECK (unresolved_count >= 0),
  eligibility_version INTEGER NOT NULL DEFAULT 1 CHECK (eligibility_version > 0),
  last_successful_sync_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT CHECK (last_error IS NULL OR length(last_error) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, webinar_id),
  FOREIGN KEY (business_id, webinar_id)
    REFERENCES public.webinars(business_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webinar_attendance_imports_due_idx
  ON public.webinar_attendance_imports(business_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.webinar_attendance_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL,
  import_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('conferences', 'participants', 'participant_sessions')),
  parent_provider_name TEXT NOT NULL DEFAULT '',
  page_key TEXT NOT NULL DEFAULT '',
  next_page_token TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, import_id, level, parent_provider_name, page_key),
  FOREIGN KEY (business_id, webinar_id)
    REFERENCES public.webinars(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, import_id)
    REFERENCES public.webinar_attendance_imports(business_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webinar_attendance_pages_lookup_idx
  ON public.webinar_attendance_pages(business_id, webinar_id, level, fetched_at DESC);

CREATE TABLE IF NOT EXISTS public.webinar_conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL,
  provider_conference_name TEXT NOT NULL,
  provider_space_name TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, webinar_id, id),
  UNIQUE (business_id, webinar_id, provider_conference_name),
  FOREIGN KEY (business_id, webinar_id)
    REFERENCES public.webinars(business_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webinar_conferences_lookup_idx
  ON public.webinar_conferences(business_id, webinar_id, started_at);

CREATE TABLE IF NOT EXISTS public.webinar_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL,
  conference_id UUID NOT NULL,
  provider_participant_name TEXT NOT NULL,
  provider_identity TEXT,
  identity_type TEXT NOT NULL DEFAULT 'unknown' CHECK (identity_type IN (
    'signed_in', 'anonymous', 'phone', 'unknown'
  )),
  email TEXT,
  display_name TEXT,
  review_disposition TEXT NOT NULL DEFAULT 'unresolved' CHECK (review_disposition IN (
    'unresolved', 'matched', 'host', 'unregistered'
  )),
  registration_id UUID,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, webinar_id, id),
  UNIQUE (business_id, webinar_id, provider_participant_name),
  FOREIGN KEY (business_id, webinar_id)
    REFERENCES public.webinars(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, webinar_id, conference_id)
    REFERENCES public.webinar_conferences(business_id, webinar_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, registration_id, webinar_id)
    REFERENCES public.webinar_registration_sessions(business_id, registration_id, webinar_id) ON DELETE SET NULL (registration_id)
);

CREATE INDEX IF NOT EXISTS webinar_participants_review_idx
  ON public.webinar_participants(business_id, webinar_id, review_disposition);

CREATE TABLE IF NOT EXISTS public.webinar_participant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL,
  conference_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  provider_session_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, provider_session_name),
  FOREIGN KEY (business_id, webinar_id)
    REFERENCES public.webinars(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, webinar_id, conference_id)
    REFERENCES public.webinar_conferences(business_id, webinar_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, webinar_id, participant_id)
    REFERENCES public.webinar_participants(business_id, webinar_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webinar_participant_sessions_participant_idx
  ON public.webinar_participant_sessions(business_id, webinar_id, participant_id, joined_at);

CREATE OR REPLACE FUNCTION public.touch_webinar_attendance_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS webinar_attendance_import_touch ON public.webinar_attendance_imports;
CREATE TRIGGER webinar_attendance_import_touch
  BEFORE UPDATE ON public.webinar_attendance_imports
  FOR EACH ROW EXECUTE FUNCTION public.touch_webinar_attendance_row();

DROP TRIGGER IF EXISTS webinar_conferences_touch ON public.webinar_conferences;
CREATE TRIGGER webinar_conferences_touch
  BEFORE UPDATE ON public.webinar_conferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_webinar_attendance_row();

DROP TRIGGER IF EXISTS webinar_participants_touch ON public.webinar_participants;
CREATE TRIGGER webinar_participants_touch
  BEFORE UPDATE ON public.webinar_participants
  FOR EACH ROW EXECUTE FUNCTION public.touch_webinar_attendance_row();

DROP TRIGGER IF EXISTS webinar_participant_sessions_touch ON public.webinar_participant_sessions;
CREATE TRIGGER webinar_participant_sessions_touch
  BEFORE UPDATE ON public.webinar_participant_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_webinar_attendance_row();

ALTER TABLE public.webinar_attendance_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_attendance_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_participant_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage webinar attendance imports" ON public.webinar_attendance_imports;
CREATE POLICY "Owners can manage webinar attendance imports"
  ON public.webinar_attendance_imports FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can read webinar attendance pages" ON public.webinar_attendance_pages;
DROP POLICY IF EXISTS "Owners can manage webinar attendance pages" ON public.webinar_attendance_pages;
CREATE POLICY "Owners can manage webinar attendance pages"
  ON public.webinar_attendance_pages FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage webinar conferences" ON public.webinar_conferences;
CREATE POLICY "Owners can manage webinar conferences"
  ON public.webinar_conferences FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage webinar participants" ON public.webinar_participants;
CREATE POLICY "Owners can manage webinar participants"
  ON public.webinar_participants FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage webinar participant sessions" ON public.webinar_participant_sessions;
CREATE POLICY "Owners can manage webinar participant sessions"
  ON public.webinar_participant_sessions FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

REVOKE ALL ON TABLE public.webinar_attendance_imports,
  public.webinar_attendance_pages,
  public.webinar_conferences,
  public.webinar_participants,
  public.webinar_participant_sessions FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.webinar_attendance_imports,
  public.webinar_conferences,
  public.webinar_participants,
  public.webinar_participant_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.webinar_attendance_pages TO authenticated;
