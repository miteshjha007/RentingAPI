-- Migration 002: profiles table
-- Linked to auth.users; created automatically on user signup via trigger.

CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  email         TEXT,
  phone         TEXT        UNIQUE,
  role          user_role   NOT NULL DEFAULT 'renter',
  avatar_url    TEXT,
  is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (needed for owner contact info)
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT
  USING (TRUE);

-- Users can update only their own profile
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
