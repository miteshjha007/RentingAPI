-- Migration 007: subscriptions
-- Inserted/updated only by the Razorpay webhook Edge Function (service role).
-- Renters read their own rows to gate premium features.

CREATE TABLE public.subscriptions (
  id                   UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID               NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan                 subscription_plan  NOT NULL,
  start_date           DATE               NOT NULL,
  end_date             DATE               NOT NULL,
  is_active            BOOLEAN            NOT NULL DEFAULT FALSE,
  -- Razorpay identifiers for reconciliation
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  -- Amount stored in paise (₹1 = 100 paise) to match Razorpay convention
  amount               INTEGER            NOT NULL,
  created_at           TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "subscriptions: user read own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all subscriptions
CREATE POLICY "subscriptions: admin read all"
  ON public.subscriptions FOR SELECT
  USING (public.is_admin());

-- Only service role (Edge Functions) can insert/update — enforced by NOT granting
-- anon/authenticated INSERT/UPDATE. The webhook function uses the service role key.
-- No explicit policy needed for service role (it bypasses RLS).
