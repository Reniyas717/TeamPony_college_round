-- Nexus Platform PostgreSQL Schema (Supabase)
-- Single-Tenant Architecture with Row-Level Security (RLS)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast username and email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. BUSINESSES (Single-Owner, Single-Business Model)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can access their business"
  ON public.businesses FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 4. CRM CONTACTS & LEADS
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'lead' NOT NULL, -- lead, active, churned, customer
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_business ON public.crm_contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON public.crm_contacts(business_id, email);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage CRM contacts"
  ON public.crm_contacts FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- 5. WEBSITES (Visual Website Builder)
CREATE TABLE IF NOT EXISTS public.websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content JSONB DEFAULT '{"sections": []}'::jsonb NOT NULL,
  is_published BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_websites_business ON public.websites(business_id);

ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage websites"
  ON public.websites FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- 6. BILLING & SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  interval TEXT DEFAULT 'month' NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL, -- active, past_due, canceled
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_business ON public.billing_subscriptions(business_id);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage subscriptions"
  ON public.billing_subscriptions FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- 7. MARKETING CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT' NOT NULL, -- DRAFT, QUEUED, SENT, FAILED
  audience_filter JSONB DEFAULT '{}'::jsonb NOT NULL,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_business ON public.marketing_campaigns(business_id);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- 8. WEBINAR MANAGEMENT
CREATE TABLE IF NOT EXISTS public.webinars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60 NOT NULL,
  status TEXT DEFAULT 'scheduled' NOT NULL, -- scheduled, live, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webinars_business ON public.webinars(business_id);

ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage webinars"
  ON public.webinars FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- 9. AI BUSINESS AGENT ACTIONS & WORKFLOW APPROVALS
CREATE TABLE IF NOT EXISTS public.ai_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  title TEXT NOT NULL,
  proposed_action TEXT NOT NULL,
  impact_summary TEXT,
  status TEXT DEFAULT 'AWAITING_APPROVAL' NOT NULL, -- DRAFT, AWAITING_APPROVAL, RUNNING, COMPLETED, REJECTED, FAILED
  idempotency_key TEXT UNIQUE,
  payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_workflows_business ON public.ai_workflows(business_id);

ALTER TABLE public.ai_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view and manage AI workflows"
  ON public.ai_workflows FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- 10. AUTOMATIC PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.businesses (owner_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'My') || '''s Workspace'
  )
  ON CONFLICT (owner_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute upon user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
