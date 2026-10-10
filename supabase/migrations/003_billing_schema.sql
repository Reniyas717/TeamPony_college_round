-- ====================================================================
-- Migration: 003_billing_schema.sql
-- Description: Operational SaaS Billing, Subscriptions, Usage-Based
--              Metering, and Invoicing for Nexus Business Platform.
-- ====================================================================

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('starter', 'growth', 'enterprise')),
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')) DEFAULT 'active',
  price_inr INTEGER NOT NULL, -- Base price in INR (e.g., 1999, 4999, 14999)
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'annual')) DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_subscription UNIQUE (business_id)
);

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_inr INTEGER NOT NULL, -- Total amount in INR
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')) DEFAULT 'paid',
  plan_id TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  paid_at TIMESTAMPTZ,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Usage Records Table
CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('crm_contacts', 'webinar_minutes', 'emails_dispatched', 'ai_operations')),
  quantity INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_metric_period UNIQUE (business_id, metric, period_start)
);

-- Indexes for performance & single-tenant filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON public.subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_business_id ON public.usage_records(business_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies per AGENTS.md §5.2
CREATE POLICY "Owners can view their subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can manage their subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view their invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can manage their invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view their usage records"
  ON public.usage_records FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update their usage records"
  ON public.usage_records FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Seed default starter subscription for default business
INSERT INTO public.subscriptions (
  business_id,
  plan_id,
  plan_name,
  status,
  price_inr,
  billing_interval
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'growth',
  'Nexus Growth Tier',
  'active',
  4999,
  'monthly'
)
ON CONFLICT (business_id) DO NOTHING;
