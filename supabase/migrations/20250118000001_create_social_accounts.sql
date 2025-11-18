-- Create social_accounts table
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook')),
  provider_user_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_provider_user 
  ON public.social_accounts(provider, provider_user_id);

-- Enable Row Level Security
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own social accounts
CREATE POLICY "Users can view own social accounts" 
  ON public.social_accounts FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to social accounts"
  ON public.social_accounts FOR ALL
  USING (auth.role() = 'service_role');
