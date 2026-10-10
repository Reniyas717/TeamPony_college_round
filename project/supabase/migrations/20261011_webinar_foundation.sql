-- Additive webinar foundation. Keep the original platform migration immutable.
ALTER TABLE public.webinars
  ALTER COLUMN scheduled_start DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS presenter TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS series_id UUID,
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_url TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS meet_space_name TEXT,
  ADD COLUMN IF NOT EXISTS meeting_uri TEXT,
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT NOT NULL DEFAULT 'not_requested';

ALTER TABLE public.webinars DROP CONSTRAINT IF EXISTS webinars_capacity_positive;
ALTER TABLE public.webinars ADD CONSTRAINT webinars_capacity_positive CHECK (capacity IS NULL OR capacity > 0);
ALTER TABLE public.webinars DROP CONSTRAINT IF EXISTS webinars_duration_positive;
ALTER TABLE public.webinars ADD CONSTRAINT webinars_duration_positive CHECK (duration_minutes > 0);
ALTER TABLE public.webinars DROP CONSTRAINT IF EXISTS webinars_schedule_required_when_scheduled;
ALTER TABLE public.webinars ADD CONSTRAINT webinars_schedule_required_when_scheduled
  CHECK (status NOT IN ('scheduled', 'live') OR scheduled_start IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.webinar_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  description TEXT,
  public_slug TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);

ALTER TABLE public.webinars
  ADD CONSTRAINT webinars_series_business_fk
  FOREIGN KEY (business_id, series_id) REFERENCES public.webinar_series(business_id, id)
  ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS webinars_public_slug_unique ON public.webinars(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS webinars_business_schedule_idx ON public.webinars(business_id, scheduled_start);
CREATE INDEX IF NOT EXISTS webinar_series_business_idx ON public.webinar_series(business_id);

ALTER TABLE public.webinar_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can manage webinar series" ON public.webinar_series;
CREATE POLICY "Owners can manage webinar series" ON public.webinar_series
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- The FK is scoped by business_id; this policy adds the same owner boundary as webinars.

CREATE OR REPLACE FUNCTION public.bump_webinar_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS webinars_bump_version ON public.webinars;
CREATE TRIGGER webinars_bump_version BEFORE UPDATE ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.bump_webinar_version();

ALTER TABLE public.webinars DROP CONSTRAINT IF EXISTS webinars_deadline_before_start;
ALTER TABLE public.webinars ADD CONSTRAINT webinars_deadline_before_start
  CHECK (registration_closes_at IS NULL OR scheduled_start IS NULL OR registration_closes_at <= scheduled_start);
ALTER TABLE public.webinars DROP CONSTRAINT IF EXISTS webinars_product_url_https;
ALTER TABLE public.webinars ADD CONSTRAINT webinars_product_url_https
  CHECK (product_url IS NULL OR product_url ~* '^https://');
