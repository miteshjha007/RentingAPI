-- Migration 008: inquiries
-- A renter expresses interest in a property; owner receives a notification.

CREATE TABLE public.inquiries (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID         NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  renter_id    UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message      TEXT,
  contact_via  contact_via  NOT NULL DEFAULT 'call',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiries_property ON public.inquiries(property_id);
CREATE INDEX idx_inquiries_owner    ON public.inquiries(owner_id);
CREATE INDEX idx_inquiries_renter   ON public.inquiries(renter_id);

-- RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Renters can submit inquiries for approved properties
CREATE POLICY "inquiries: renter insert"
  ON public.inquiries FOR INSERT
  WITH CHECK (
    auth.uid() = renter_id
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.is_approved = TRUE
    )
  );

-- Renters see their own inquiries
CREATE POLICY "inquiries: renter read own"
  ON public.inquiries FOR SELECT
  USING (auth.uid() = renter_id);

-- Owners see all inquiries for their properties
CREATE POLICY "inquiries: owner read"
  ON public.inquiries FOR SELECT
  USING (auth.uid() = owner_id);

-- Admins see all
CREATE POLICY "inquiries: admin read all"
  ON public.inquiries FOR SELECT
  USING (public.is_admin());
