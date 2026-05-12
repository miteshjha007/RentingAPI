-- seed.sql — Development seed data
-- Run after all migrations. Uses service role to bypass RLS.
-- DO NOT run in production.

-- ── Demo admin user ───────────────────────────────────────────────────────────
-- Create via Supabase Auth API first, then update role here.
-- Replace the UUID below with the actual user id after signup.

-- UPDATE public.profiles
--   SET role = 'admin', name = 'Admin User', is_verified = TRUE
--   WHERE email = 'admin@rentapp.in';

-- ── Sample cities (used for search autocomplete) ──────────────────────────────
-- No separate table needed — derived from properties.city.

-- ── Admin settings overrides for dev ─────────────────────────────────────────
UPDATE public.admin_settings SET value = '99'   WHERE key = 'subscription_monthly_inr';
UPDATE public.admin_settings SET value = '249'  WHERE key = 'subscription_quarterly_inr';
UPDATE public.admin_settings SET value = '799'  WHERE key = 'subscription_yearly_inr';
UPDATE public.admin_settings SET value = '5'    WHERE key = 'commission_percent';
