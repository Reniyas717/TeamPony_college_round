-- ====================================================================
-- Migration: 001_crm_schema.sql
-- Description: Core CRM schema for single-owner business isolation,
--              contacts management, sales pipeline, and activity timeline.
-- ====================================================================

-- 1. Businesses Table (Single-owner model per AGENTS.md §4.1)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID, -- Links to auth.users if Supabase Auth is active
  name TEXT NOT NULL DEFAULT 'Nexus Studio',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default business for single-owner environment
INSERT INTO public.businesses (id, name, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nexus Studio', 'INR')
ON CONFLICT (id) DO NOTHING;

-- 2. CRM Contacts Table
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned')),
  value INTEGER NOT NULL DEFAULT 0, -- Deal value in base currency (e.g., INR)
  source TEXT NOT NULL CHECK (source IN ('website_form', 'webinar', 'manual', 'referral')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  next_action_text TEXT,
  next_action_due_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CRM Activity Timeline
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('form_submission', 'stage_change', 'note', 'email_sent', 'ai_agent_action')),
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT NOT NULL CHECK (actor IN ('owner', 'system', 'ai_agent')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. High-Performance Indices
CREATE INDEX IF NOT EXISTS idx_crm_contacts_biz_stage ON public.crm_contacts(business_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_biz_email ON public.crm_contacts(business_id, email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_biz_last_act ON public.crm_contacts(business_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON public.crm_activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_biz ON public.crm_activities(business_id, created_at DESC);

-- 5. Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Allow full access for service role and default operations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Allow access to business'
  ) THEN
    CREATE POLICY "Allow access to business" ON public.businesses FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_contacts' AND policyname = 'Allow access to crm_contacts'
  ) THEN
    CREATE POLICY "Allow access to crm_contacts" ON public.crm_contacts FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_activities' AND policyname = 'Allow access to crm_activities'
  ) THEN
    CREATE POLICY "Allow access to crm_activities" ON public.crm_activities FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
