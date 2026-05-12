-- Migration 006: saved_properties (favourites)

CREATE TABLE public.saved_properties (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id  UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_saved_user ON public.saved_properties(user_id);

-- RLS
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_properties: user read own"
  ON public.saved_properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_properties: user insert"
  ON public.saved_properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_properties: user delete"
  ON public.saved_properties FOR DELETE
  USING (auth.uid() = user_id);
