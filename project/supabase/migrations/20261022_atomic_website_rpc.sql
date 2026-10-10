-- Atomic website mutations for the visual website builder.
--
-- Each function derives the business from auth.uid(), changes one website row,
-- and records its audit event before returning. Any audit failure aborts the
-- whole RPC transaction.

CREATE OR REPLACE FUNCTION public.website_create_with_audit(
  p_title TEXT,
  p_slug TEXT,
  p_content JSONB,
  p_template_id TEXT
)
RETURNS public.websites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_website public.websites;
  v_section_count INTEGER := 0;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBSITE_BUSINESS_NOT_FOUND';
  END IF;

  IF p_title IS NULL OR length(p_title) NOT BETWEEN 1 AND 100
     OR p_slug IS NULL OR p_slug !~ '^[a-z0-9-]+$'
     OR p_template_id NOT IN ('editorial-luxury', 'modern-saas', 'creative-studio', 'blank')
     OR p_content IS NULL OR jsonb_typeof(p_content) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WEBSITE_PAYLOAD_INVALID';
  END IF;

  IF jsonb_typeof(p_content -> 'sections') = 'array' THEN
    v_section_count := jsonb_array_length(p_content -> 'sections');
  END IF;

  INSERT INTO public.websites (business_id, title, slug, content, is_published)
  VALUES (v_business_id, p_title, p_slug, p_content, false)
  RETURNING * INTO v_website;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business',
    p_business_id => v_business_id,
    p_action => 'website.created',
    p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user',
    p_resource_type => 'website',
    p_resource_id => v_website.id::TEXT,
    p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'website_id', v_website.id,
      'website_title', v_website.title,
      'slug', v_website.slug,
      'template_id', p_template_id,
      'section_count', v_section_count
    )
  );

  RETURN v_website;
END;
$$;

CREATE OR REPLACE FUNCTION public.website_save_with_audit(
  p_website_id UUID,
  p_title TEXT,
  p_slug TEXT,
  p_content JSONB,
  p_is_published BOOLEAN,
  p_changed_fields TEXT[]
)
RETURNS public.websites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_website public.websites;
  v_section_count INTEGER := 0;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBSITE_BUSINESS_NOT_FOUND';
  END IF;

  IF (p_title IS NOT NULL AND length(p_title) NOT BETWEEN 1 AND 100)
     OR (p_slug IS NOT NULL AND p_slug !~ '^[a-z0-9-]+$')
     OR p_content IS NULL OR jsonb_typeof(p_content) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'WEBSITE_PAYLOAD_INVALID';
  END IF;

  IF jsonb_typeof(p_content -> 'sections') = 'array' THEN
    v_section_count := jsonb_array_length(p_content -> 'sections');
  END IF;

  UPDATE public.websites
  SET title = COALESCE(p_title, title),
      slug = COALESCE(p_slug, slug),
      content = p_content,
      is_published = COALESCE(p_is_published, is_published),
      updated_at = timezone('utc'::TEXT, now())
  WHERE id = p_website_id
    AND business_id = v_business_id
  RETURNING * INTO v_website;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'WEBSITE_NOT_FOUND';
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business',
    p_business_id => v_business_id,
    p_action => 'website.updated',
    p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user',
    p_resource_type => 'website',
    p_resource_id => v_website.id::TEXT,
    p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'website_id', v_website.id,
      'title', v_website.title,
      'sections_count', v_section_count,
      'changed_fields', to_jsonb(COALESCE(p_changed_fields, ARRAY[]::TEXT[]))
    )
  );

  RETURN v_website;
END;
$$;

CREATE OR REPLACE FUNCTION public.website_publish_with_audit(p_website_id UUID)
RETURNS public.websites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_website public.websites;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBSITE_BUSINESS_NOT_FOUND';
  END IF;

  UPDATE public.websites
  SET is_published = true,
      updated_at = timezone('utc'::TEXT, now())
  WHERE id = p_website_id
    AND business_id = v_business_id
  RETURNING * INTO v_website;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'WEBSITE_NOT_FOUND';
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business',
    p_business_id => v_business_id,
    p_action => 'website.published',
    p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user',
    p_resource_type => 'website',
    p_resource_id => v_website.id::TEXT,
    p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'website_id', v_website.id,
      'website_title', v_website.title
    )
  );

  RETURN v_website;
END;
$$;

CREATE OR REPLACE FUNCTION public.website_unpublish_with_audit(p_website_id UUID)
RETURNS public.websites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_website public.websites;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBSITE_BUSINESS_NOT_FOUND';
  END IF;

  UPDATE public.websites
  SET is_published = false,
      updated_at = timezone('utc'::TEXT, now())
  WHERE id = p_website_id
    AND business_id = v_business_id
  RETURNING * INTO v_website;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'WEBSITE_NOT_FOUND';
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business',
    p_business_id => v_business_id,
    p_action => 'website.unpublished',
    p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user',
    p_resource_type => 'website',
    p_resource_id => v_website.id::TEXT,
    p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'website_id', v_website.id,
      'website_title', v_website.title
    )
  );

  RETURN v_website;
END;
$$;

CREATE OR REPLACE FUNCTION public.website_delete_with_audit(p_website_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_business_id UUID;
  v_website public.websites;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE owner_id = auth.uid();

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WEBSITE_BUSINESS_NOT_FOUND';
  END IF;

  DELETE FROM public.websites
  WHERE id = p_website_id
    AND business_id = v_business_id
  RETURNING * INTO v_website;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'WEBSITE_NOT_FOUND';
  END IF;

  PERFORM public.record_audit_log_tx(
    p_scope => 'business',
    p_business_id => v_business_id,
    p_action => 'website.deleted',
    p_actor_id => auth.uid()::TEXT,
    p_actor_type => 'user',
    p_resource_type => 'website',
    p_resource_id => v_website.id::TEXT,
    p_outcome => 'success',
    p_metadata => jsonb_build_object(
      'website_id', v_website.id,
      'deleted_title', v_website.title,
      'deleted_slug', v_website.slug
    )
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.website_create_with_audit(TEXT, TEXT, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.website_save_with_audit(UUID, TEXT, TEXT, JSONB, BOOLEAN, TEXT[])
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.website_publish_with_audit(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.website_unpublish_with_audit(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.website_delete_with_audit(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.website_create_with_audit(TEXT, TEXT, JSONB, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.website_save_with_audit(UUID, TEXT, TEXT, JSONB, BOOLEAN, TEXT[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.website_publish_with_audit(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.website_unpublish_with_audit(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.website_delete_with_audit(UUID)
  TO authenticated;

-- Website reads remain available through the existing owner RLS policy, while
-- browser roles can no longer mutate the table outside the audited RPCs.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.websites FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.websites TO authenticated;
