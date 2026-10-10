-- Migration: 20261013_journey_maps.sql
-- Description: AI-Powered Customer Journey Maps, Visual Stages, and Executable Actions

CREATE TABLE IF NOT EXISTS public.customer_journey_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  archetype TEXT NOT NULL DEFAULT 'acquisition_conversion',
  target_persona TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journey_map_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_map_id UUID NOT NULL REFERENCES public.customer_journey_maps(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  stage_key TEXT NOT NULL, -- e.g. awareness, consideration, signup, activation, conversion, retention
  stage_name TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_actions TEXT[] NOT NULL DEFAULT '{}',
  customer_thoughts TEXT[] NOT NULL DEFAULT '{}',
  emotion TEXT NOT NULL DEFAULT 'neutral', -- delightful, positive, neutral, confused, frustrated
  touchpoints TEXT[] NOT NULL DEFAULT '{}', -- website, form, email, webinar, checkout, crm
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  opportunities TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journey_stage_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.journey_map_stages(id) ON DELETE CASCADE,
  journey_map_id UUID NOT NULL REFERENCES public.customer_journey_maps(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  module_target TEXT NOT NULL, -- crm, campaign, website, webinar
  suggested_action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_impact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, APPROVED, EXECUTED, DISMISSED
  idempotency_key TEXT UNIQUE,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance and tenant queries
CREATE INDEX IF NOT EXISTS idx_journey_maps_business ON public.customer_journey_maps(business_id);
CREATE INDEX IF NOT EXISTS idx_journey_stages_map ON public.journey_map_stages(journey_map_id, order_index);
CREATE INDEX IF NOT EXISTS idx_journey_actions_stage ON public.journey_stage_actions(stage_id);

-- Enable RLS
ALTER TABLE public.customer_journey_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_map_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_stage_actions ENABLE ROW LEVEL SECURITY;

-- Single-tenant RLS policies
CREATE POLICY "Owners can manage journey maps"
  ON public.customer_journey_maps FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can manage journey stages"
  ON public.journey_map_stages FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can manage journey stage actions"
  ON public.journey_stage_actions FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
