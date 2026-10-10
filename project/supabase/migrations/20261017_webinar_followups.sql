-- Link optional reviewed webinar messages to the existing marketing draft model.
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS webinar_id UUID,
  ADD COLUMN IF NOT EXISTS webinar_followup_kind TEXT;

ALTER TABLE public.marketing_campaigns
  DROP CONSTRAINT IF EXISTS marketing_campaigns_webinar_followup_kind_check;
ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_webinar_followup_kind_check
  CHECK (webinar_followup_kind IS NULL OR webinar_followup_kind IN ('attendee', 'no_show'));
CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaigns_business_id_id_unique
  ON public.marketing_campaigns(business_id, id);
ALTER TABLE public.marketing_campaigns
  DROP CONSTRAINT IF EXISTS marketing_campaigns_webinar_business_fk;
ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_webinar_business_fk
  FOREIGN KEY (business_id, webinar_id) REFERENCES public.webinars(business_id, id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaigns_webinar_followup_unique
  ON public.marketing_campaigns(business_id, webinar_id, webinar_followup_kind);

CREATE TABLE IF NOT EXISTS public.webinar_followups (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL,
  attendee_campaign_id UUID,
  no_show_campaign_id UUID,
  enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'draft', 'scheduled', 'blocked', 'partial', 'provider_accepted', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  approval_version INTEGER NOT NULL DEFAULT 0 CHECK (approval_version >= 0),
  eligibility_version INTEGER,
  recipient_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_hash TEXT,
  approved_at TIMESTAMPTZ,
  last_error TEXT CHECK (last_error IS NULL OR length(last_error) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, webinar_id),
  FOREIGN KEY (business_id, webinar_id) REFERENCES public.webinars(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, attendee_campaign_id) REFERENCES public.marketing_campaigns(business_id, id) ON DELETE SET NULL (attendee_campaign_id),
  FOREIGN KEY (business_id, no_show_campaign_id) REFERENCES public.marketing_campaigns(business_id, id) ON DELETE SET NULL (no_show_campaign_id)
);

CREATE OR REPLACE FUNCTION public.validate_webinar_followup_email(p_job_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  job public.webinar_email_outbox%ROWTYPE;
  approved public.webinar_followups%ROWTYPE;
  current_eligibility INTEGER;
BEGIN
  SELECT * INTO job FROM public.webinar_email_outbox WHERE id = p_job_id;
  IF job.id IS NULL OR job.kind NOT IN ('followup_attendee', 'followup_no_show') THEN RETURN false; END IF;
  SELECT * INTO approved FROM public.webinar_followups
    WHERE business_id = job.business_id AND webinar_id = job.webinar_id;
  SELECT eligibility_version INTO current_eligibility FROM public.webinar_attendance_imports
    WHERE business_id = job.business_id AND webinar_id = job.webinar_id AND status = 'complete' AND unresolved_count = 0;
  RETURN FOUND
    AND approved.enabled AND approved.status = 'scheduled'
    AND approved.approval_version = (job.payload->>'approval_version')::INTEGER
    AND approved.eligibility_version = current_eligibility
    AND approved.snapshot_hash = job.payload->>'snapshot_hash'
    AND EXISTS (SELECT 1 FROM public.webinars w WHERE w.business_id = job.business_id
      AND w.id = job.webinar_id AND w.status <> 'cancelled' AND w.followup_enabled
      AND w.scheduled_start + make_interval(mins => w.duration_minutes) <= now())
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(approved.recipient_snapshot) r
      WHERE r->>'registration_id' = job.payload->>'registration_id'
        AND r->>'email' = job.to_email
        AND r->>'audience' = CASE job.kind WHEN 'followup_attendee' THEN 'attendee' ELSE 'no_show' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_webinar_email_blocked(p_job_id UUID, p_worker_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.webinar_email_outbox SET status = 'blocked', lease_owner = NULL,
    lease_expires_at = NULL, last_error = 'Follow-up approval or attendance eligibility changed before delivery.'
  WHERE id = p_job_id AND status = 'processing' AND lease_owner = p_worker_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_webinar_followup_email(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_webinar_email_blocked(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_webinar_followup_email(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webinar_email_blocked(UUID, TEXT) TO service_role;



ALTER TABLE public.webinar_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can read webinar follow-ups"
  ON public.webinar_followups FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
REVOKE ALL ON TABLE public.webinar_followups FROM anon, public;
GRANT SELECT ON TABLE public.webinar_followups TO authenticated;

CREATE INDEX IF NOT EXISTS webinar_followups_due_idx
  ON public.webinar_followups(scheduled_for, business_id)
  WHERE enabled AND status = 'scheduled';

CREATE OR REPLACE FUNCTION public.cancel_webinar_followups_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.webinar_followups
    SET status = 'cancelled', enabled = false, scheduled_for = NULL, updated_at = now(),
        last_error = 'Session cancelled before follow-up delivery.'
    WHERE business_id = NEW.business_id AND webinar_id = NEW.id
      AND status = 'scheduled';
    UPDATE public.webinar_email_outbox
    SET status = 'cancelled', lease_owner = NULL, lease_expires_at = NULL,
        last_error = 'Session cancelled before follow-up delivery.'
    WHERE business_id = NEW.business_id AND webinar_id = NEW.id
      AND kind IN ('followup_attendee', 'followup_no_show') AND status = 'queued';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS webinars_cancel_followups ON public.webinars;
CREATE TRIGGER webinars_cancel_followups AFTER UPDATE OF status ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.cancel_webinar_followups_on_cancel();

CREATE OR REPLACE FUNCTION public.invalidate_webinar_followups_on_reschedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.scheduled_start IS DISTINCT FROM OLD.scheduled_start
     OR NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    UPDATE public.webinar_followups
    SET status = CASE WHEN enabled THEN 'draft' ELSE 'disabled' END,
        scheduled_for = NULL, approval_version = approval_version + 1,
        eligibility_version = NULL, recipient_snapshot = '[]'::jsonb,
        snapshot_hash = NULL, approved_at = NULL,
        last_error = 'The session was rescheduled; review attendance and schedule follow-up again.',
        updated_at = now()
    WHERE business_id = NEW.business_id AND webinar_id = NEW.id;
    UPDATE public.webinar_email_outbox
    SET status = 'cancelled', lease_owner = NULL, lease_expires_at = NULL,
        last_error = 'The session was rescheduled before follow-up delivery.'
    WHERE business_id = NEW.business_id AND webinar_id = NEW.id
      AND kind IN ('followup_attendee', 'followup_no_show')
      AND status IN ('queued', 'processing');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS webinars_invalidate_followups_on_reschedule ON public.webinars;
CREATE TRIGGER webinars_invalidate_followups_on_reschedule
  AFTER UPDATE OF scheduled_start, timezone ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_webinar_followups_on_reschedule();

CREATE OR REPLACE FUNCTION public.guard_webinar_delete_during_email_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM 1 FROM public.webinar_email_outbox
  WHERE business_id = OLD.business_id AND webinar_id = OLD.id
  FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.webinar_email_outbox
      WHERE business_id = OLD.business_id AND webinar_id = OLD.id
        AND status IN ('processing', 'unknown')) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'WEBINAR_EMAIL_RECONCILIATION_REQUIRED';
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS webinars_guard_delete_during_delivery ON public.webinars;
CREATE TRIGGER webinars_guard_delete_during_delivery
  BEFORE DELETE ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.guard_webinar_delete_during_email_delivery();

CREATE TABLE IF NOT EXISTS public.webinar_registration_rate_limits (
  bucket_hash TEXT PRIMARY KEY CHECK (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webinar_registration_rate_limits_updated_idx
  ON public.webinar_registration_rate_limits(updated_at);
ALTER TABLE public.webinar_registration_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.webinar_registration_rate_limits FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.take_webinar_registration_rate_limit(
  p_bucket_hash TEXT, p_limit INTEGER DEFAULT 5, p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  accepted BOOLEAN;
  bounded_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
  bounded_window INTEGER := LEAST(GREATEST(COALESCE(p_window_seconds, 60), 10), 3600);
BEGIN
  IF p_bucket_hash IS NULL OR p_bucket_hash !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
  INSERT INTO public.webinar_registration_rate_limits(bucket_hash, window_started_at, request_count)
  VALUES (p_bucket_hash, now(), 1)
  ON CONFLICT (bucket_hash) DO UPDATE
    SET window_started_at = CASE
          WHEN public.webinar_registration_rate_limits.window_started_at + make_interval(secs => bounded_window) <= now() THEN now()
          ELSE public.webinar_registration_rate_limits.window_started_at END,
        request_count = CASE
          WHEN public.webinar_registration_rate_limits.window_started_at + make_interval(secs => bounded_window) <= now() THEN 1
          ELSE public.webinar_registration_rate_limits.request_count + 1 END,
        updated_at = now()
    WHERE public.webinar_registration_rate_limits.window_started_at + make_interval(secs => bounded_window) <= now()
       OR public.webinar_registration_rate_limits.request_count < bounded_limit
  RETURNING true INTO accepted;
  RETURN COALESCE(accepted, false);
END;
$$;
REVOKE ALL ON FUNCTION public.take_webinar_registration_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.take_webinar_registration_rate_limit(TEXT, INTEGER, INTEGER) TO anon, authenticated;
