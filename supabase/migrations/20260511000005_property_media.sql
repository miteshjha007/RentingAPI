-- Migration 005: property_media table
-- Stores Supabase Storage URLs for images and videos.
-- Never store base64 data; always reference Storage bucket paths.

CREATE TABLE public.property_media (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  type         media_type  NOT NULL DEFAULT 'image',
  -- Human-readable label for the room/area photographed
  room_label   TEXT,       -- e.g. 'room1', 'room2', 'kitchen', 'bathroom', 'exterior', 'hall'
  order_index  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_media_property ON public.property_media(property_id, order_index);

-- RLS
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

-- Public can read media of approved properties
CREATE POLICY "property_media: read approved"
  ON public.property_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.is_approved = TRUE OR p.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- Owners can insert media for their own properties
CREATE POLICY "property_media: owner insert"
  ON public.property_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
  );

-- Owners can delete their own property media
CREATE POLICY "property_media: owner delete"
  ON public.property_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "property_media: admin all"
  ON public.property_media FOR ALL
  USING (public.is_admin());
