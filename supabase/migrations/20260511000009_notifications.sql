-- Migration 009: notifications
-- In-app notification store. Realtime subscription on this table drives
-- the mobile push via the notify-owner Edge Function.

CREATE TABLE public.notifications (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT              NOT NULL,
  body        TEXT              NOT NULL,
  type        notification_type NOT NULL DEFAULT 'general',
  is_read     BOOLEAN           NOT NULL DEFAULT FALSE,
  -- Flexible payload: inquiry_id, property_id, etc.
  data        JSONB             DEFAULT '{}',
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user     ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read  ON public.notifications(user_id, is_read);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users read their own notifications
CREATE POLICY "notifications: user read own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read (UPDATE is_read only)
CREATE POLICY "notifications: user update own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Functions) inserts notifications — bypasses RLS automatically.
-- Admins can also insert (for broadcast notifications from admin panel)
CREATE POLICY "notifications: admin insert"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- Enable Realtime on this table so mobile app receives live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
