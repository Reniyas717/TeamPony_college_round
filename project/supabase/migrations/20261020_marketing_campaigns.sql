-- Migration: 20261020_marketing_campaigns.sql
-- Description: Multi-Channel Marketing Campaigns, Dynamic Segmentation, Delivery Logs, and Real Engagement Telemetry

-- 1. Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email', -- 'email' | 'sms' | 'whatsapp'
  subject TEXT,
  preview_text TEXT,
  content_html TEXT NOT NULL,
  content_text TEXT,
  segment_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'AWAITING_APPROVAL' | 'QUEUED' | 'SENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  bounced_count INTEGER NOT NULL DEFAULT 0,
  unsubscribed_count INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Campaign Recipients Table (Individual dispatch log per contact)
CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_phone TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'SUPPRESSED'
  provider_message_id TEXT,
  tracking_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  first_opened_at TIMESTAMPTZ,
  first_clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Engagement Events Table (Immutable log of opens & clicks)
CREATE TABLE IF NOT EXISTS public.marketing_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.marketing_campaign_recipients(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'OPEN' | 'CLICK' | 'UNSUBSCRIBE'
  target_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Suppression / Opt-out List Table
CREATE TABLE IF NOT EXISTS public.marketing_suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  email_or_phone TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'all', -- 'email' | 'sms' | 'whatsapp' | 'all'
  reason TEXT NOT NULL DEFAULT 'user_unsubscribe', -- 'user_unsubscribe' | 'hard_bounce' | 'complaint'
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_business_suppression UNIQUE (business_id, email_or_phone, channel)
);

-- 5. High-Performance Indices
CREATE INDEX IF NOT EXISTS idx_campaigns_business ON public.marketing_campaigns(business_id, status);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON public.marketing_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_recipients_token ON public.marketing_campaign_recipients(tracking_token);
CREATE INDEX IF NOT EXISTS idx_suppression_lookup ON public.marketing_suppression_list(business_id, email_or_phone);
CREATE INDEX IF NOT EXISTS idx_engagement_campaign ON public.marketing_engagement_events(campaign_id, event_type);

-- 6. Row Level Security Enforcement
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_suppression_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for campaigns" ON public.marketing_campaigns FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation for recipients" ON public.marketing_campaign_recipients FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation for engagement events" ON public.marketing_engagement_events FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation for suppression list" ON public.marketing_suppression_list FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
