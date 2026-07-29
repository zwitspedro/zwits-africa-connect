ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.provider_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  national_id TEXT,
  country TEXT,
  city TEXT,
  business_type TEXT,
  years_experience INTEGER,
  service_categories TEXT[] NOT NULL DEFAULT '{}',
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  business_address TEXT,
  website TEXT,
  social_handle TEXT,
  payout_method TEXT,
  bank_name TEXT,
  bank_account TEXT,
  mobile_money_number TEXT,
  tax_number TEXT,
  working_days TEXT[] NOT NULL DEFAULT '{}',
  work_start TEXT,
  work_end TEXT,
  emergency_services BOOLEAN NOT NULL DEFAULT false,
  max_travel_km NUMERIC NOT NULL DEFAULT 20,
  background_check_consent BOOLEAN NOT NULL DEFAULT false,
  business_reg_url TEXT,
  certificate_url TEXT,
  proof_of_address_url TEXT,
  portfolio_urls TEXT[] NOT NULL DEFAULT '{}',
  completed_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.provider_onboarding TO authenticated;
GRANT ALL ON public.provider_onboarding TO service_role;

ALTER TABLE public.provider_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own onboarding"
  ON public.provider_onboarding FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers insert own onboarding"
  ON public.provider_onboarding FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers update own onboarding"
  ON public.provider_onboarding FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_provider_onboarding_updated_at
  BEFORE UPDATE ON public.provider_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();