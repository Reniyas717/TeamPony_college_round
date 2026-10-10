-- Server-only encrypted Google provider credentials for the existing Supabase OAuth login.
CREATE TABLE IF NOT EXISTS public.business_google_provider_tokens (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_auth_tag TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_google_provider_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.business_google_provider_tokens FROM anon, authenticated, public;
GRANT ALL ON TABLE public.business_google_provider_tokens TO service_role;

COMMENT ON TABLE public.business_google_provider_tokens IS
  'Encrypted Google provider tokens obtained only from the existing Supabase Google sign-in callback. Never select into browser responses.';
