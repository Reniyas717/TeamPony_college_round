-- Owner-reviewed, transactional deletion for a series and all of its sessions.
CREATE OR REPLACE FUNCTION public.guard_webinar_delete_during_email_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.provisioning_status IN ('provisioning', 'unknown') THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'WEBINAR_MEET_RECONCILIATION_REQUIRED';
  END IF;
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

CREATE OR REPLACE FUNCTION public.webinar_series_delete_counts(p_series_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  target public.webinar_series%ROWTYPE;
  counts JSONB;
BEGIN
  SELECT * INTO target FROM public.webinar_series s
  WHERE s.id = p_series_id
    AND s.business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid());
  IF target.id IS NULL THEN RAISE EXCEPTION 'WEBINAR_SERIES_NOT_FOUND'; END IF;
  SELECT jsonb_build_object(
    'sessions', (SELECT count(*) FROM public.webinars w WHERE w.business_id = target.business_id AND w.series_id = target.id),
    'registrations', (SELECT count(*) FROM public.webinar_registration_sessions rs JOIN public.webinars w ON w.business_id = rs.business_id AND w.id = rs.webinar_id WHERE w.business_id = target.business_id AND w.series_id = target.id),
    'participants', (SELECT count(*) FROM public.webinar_participants p JOIN public.webinars w ON w.business_id = p.business_id AND w.id = p.webinar_id WHERE w.business_id = target.business_id AND w.series_id = target.id),
    'join_sessions', (SELECT count(*) FROM public.webinar_participant_sessions ps JOIN public.webinars w ON w.business_id = ps.business_id AND w.id = ps.webinar_id WHERE w.business_id = target.business_id AND w.series_id = target.id),
    'feedback', (SELECT count(*) FROM public.webinar_feedback f JOIN public.webinars w ON w.business_id = f.business_id AND w.id = f.webinar_id WHERE w.business_id = target.business_id AND w.series_id = target.id),
    'campaigns', (SELECT count(*) FROM public.marketing_campaigns c JOIN public.webinars w ON w.business_id = c.business_id AND w.id = c.webinar_id WHERE w.business_id = target.business_id AND w.series_id = target.id),
    'active_delivery', (SELECT count(*) FROM public.webinar_email_outbox o JOIN public.webinars w ON w.business_id = o.business_id AND w.id = o.webinar_id WHERE w.business_id = target.business_id AND w.series_id = target.id AND o.status = 'processing'),
    'unknown_delivery', (SELECT count(*) FROM public.webinar_email_outbox o JOIN public.webinars w ON w.business_id = o.business_id AND w.id = o.webinar_id WHERE w.business_id = target.business_id AND w.series_id = target.id AND o.status = 'unknown'),
    'meet_operations', (SELECT count(*) FROM public.webinars w WHERE w.business_id = target.business_id AND w.series_id = target.id AND w.provisioning_status IN ('provisioning', 'unknown'))
  ) INTO counts;
  RETURN counts;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_webinar_series(p_series_id UUID, p_expected_counts JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  target public.webinar_series%ROWTYPE;
  actual_counts JSONB;
BEGIN
  SELECT * INTO target FROM public.webinar_series s
  WHERE s.id = p_series_id
    AND s.business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid())
  FOR UPDATE;
  IF target.id IS NULL THEN RAISE EXCEPTION 'WEBINAR_SERIES_NOT_FOUND'; END IF;

  PERFORM w.id FROM public.webinars w
  WHERE w.business_id = target.business_id AND w.series_id = target.id
  ORDER BY w.id FOR UPDATE;
  PERFORM o.id FROM public.webinar_email_outbox o
  JOIN public.webinars w ON w.business_id = o.business_id AND w.id = o.webinar_id
  WHERE w.business_id = target.business_id AND w.series_id = target.id
  ORDER BY o.id FOR UPDATE OF o;

  actual_counts := public.webinar_series_delete_counts(p_series_id);
  IF actual_counts IS DISTINCT FROM p_expected_counts THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'WEBINAR_SERIES_DELETE_PREVIEW_STALE';
  END IF;
  IF (actual_counts->>'active_delivery')::INTEGER > 0
     OR (actual_counts->>'unknown_delivery')::INTEGER > 0
     OR (actual_counts->>'meet_operations')::INTEGER > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'WEBINAR_SERIES_EXTERNAL_OPERATION_UNRESOLVED';
  END IF;

  DELETE FROM public.webinar_series WHERE business_id = target.business_id AND id = target.id;
  RETURN actual_counts;
END;
$$;

REVOKE ALL ON FUNCTION public.webinar_series_delete_counts(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_webinar_series(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.webinar_series_delete_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_webinar_series(UUID, JSONB) TO authenticated;
