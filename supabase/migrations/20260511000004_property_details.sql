-- Migration 004: property_details table
-- Holds type-specific extended fields. One row per property.
-- Columns not relevant to the property type are left NULL.

CREATE TABLE public.property_details (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id             UUID          NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,

  -- ── Flat / Home fields ─────────────────────────────────────────────────────
  bhk_type                TEXT,                   -- '1BHK', '2BHK', '3BHK', '4BHK+'
  num_bathrooms           INTEGER,
  num_kitchens            INTEGER,
  balcony                 BOOLEAN       DEFAULT FALSE,
  parking                 BOOLEAN       DEFAULT FALSE,
  garden                  BOOLEAN       DEFAULT FALSE,
  area_sqft               NUMERIC(10,2),
  distance_from_market    TEXT,

  -- ── PG / Hostel fields ─────────────────────────────────────────────────────
  gender_allowed          gender_allowed,
  room_type               room_type,
  food_included           BOOLEAN       DEFAULT FALSE,
  open_time               TIME,
  close_time              TIME,

  -- ── Common amenities ───────────────────────────────────────────────────────
  -- e.g. ['bed','fan','bulb','ac','wifi','geyser','tv','refrigerator']
  available_services      TEXT[]        DEFAULT '{}',
  kitchen_available       BOOLEAN       DEFAULT FALSE,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.property_details ENABLE ROW LEVEL SECURITY;

-- Read: same visibility rules as properties (join via property_id)
CREATE POLICY "property_details: read approved"
  ON public.property_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.is_approved = TRUE OR p.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- Owner can insert details for their own properties
CREATE POLICY "property_details: owner insert"
  ON public.property_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
  );

-- Owner can update details for their own properties
CREATE POLICY "property_details: owner update"
  ON public.property_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "property_details: admin all"
  ON public.property_details FOR ALL
  USING (public.is_admin());
