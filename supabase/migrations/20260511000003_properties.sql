-- Migration 003: properties table

CREATE TABLE public.properties (
  id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type                property_type           NOT NULL,
  title               TEXT                    NOT NULL,
  description         TEXT,
  -- Pricing (stored in rupees; Razorpay conversion to paise is done at order time)
  price               NUMERIC(10, 2)          NOT NULL,
  security_deposit    NUMERIC(10, 2)          DEFAULT 0,
  electricity_charges electricity_charges_type NOT NULL DEFAULT 'extra',
  -- Physical attributes
  floor               TEXT,
  total_floors        INTEGER,
  furnished_status    furnished_status        NOT NULL DEFAULT 'unfurnished',
  available_from      DATE,
  is_available        BOOLEAN                 NOT NULL DEFAULT TRUE,
  -- Admin approval gate — property hidden from renters until approved
  is_approved         BOOLEAN                 NOT NULL DEFAULT FALSE,
  rejection_reason    TEXT,
  -- Location
  state               TEXT                    NOT NULL,
  city                TEXT                    NOT NULL,
  area                TEXT,
  pincode             TEXT,
  full_address        TEXT,
  latitude            NUMERIC(10, 7),
  longitude           NUMERIC(10, 7),
  -- Timestamps
  created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Indexes for common query patterns
CREATE INDEX idx_properties_owner        ON public.properties(owner_id);
CREATE INDEX idx_properties_type         ON public.properties(type);
CREATE INDEX idx_properties_city         ON public.properties(city);
CREATE INDEX idx_properties_is_approved  ON public.properties(is_approved);
CREATE INDEX idx_properties_location     ON public.properties(latitude, longitude);

-- RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Helper: check if the calling user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Renters / anonymous see only approved, available listings
CREATE POLICY "properties: public read approved"
  ON public.properties FOR SELECT
  USING (is_approved = TRUE AND is_available = TRUE);

-- Owners see all their own properties regardless of approval status
CREATE POLICY "properties: owner read own"
  ON public.properties FOR SELECT
  USING (auth.uid() = owner_id);

-- Admins can read everything
CREATE POLICY "properties: admin read all"
  ON public.properties FOR SELECT
  USING (public.is_admin());

-- Owners can insert properties (they start as unapproved)
CREATE POLICY "properties: owner insert"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND is_approved = FALSE);

-- Owners can update their own properties (but cannot self-approve)
CREATE POLICY "properties: owner update"
  ON public.properties FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id AND is_approved = FALSE);

-- Admins can update any property (approval/rejection)
CREATE POLICY "properties: admin update"
  ON public.properties FOR UPDATE
  USING (public.is_admin());

-- Owners can delete their own properties
CREATE POLICY "properties: owner delete"
  ON public.properties FOR DELETE
  USING (auth.uid() = owner_id);

-- Admins can delete any property
CREATE POLICY "properties: admin delete"
  ON public.properties FOR DELETE
  USING (public.is_admin());
