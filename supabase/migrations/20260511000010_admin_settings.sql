-- Migration 010: admin_settings
-- Key-value store for runtime config (commission %, subscription prices, etc.)

CREATE TABLE public.admin_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read settings (needed to display subscription prices in app)
CREATE POLICY "admin_settings: authenticated read"
  ON public.admin_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify settings
CREATE POLICY "admin_settings: admin write"
  ON public.admin_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed default settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('commission_percent',       '5'),
  ('subscription_monthly_inr', '99'),
  ('subscription_quarterly_inr','249'),
  ('subscription_yearly_inr',  '799'),
  ('max_free_inquiries',       '3'),
  ('app_version_android',      '1.0.0'),
  ('app_version_ios',          '1.0.0'),
  ('maintenance_mode',         'false');
