-- Migration 012: Add expo_push_token to profiles
-- Stored here so notify-owner Edge Function can look up the token without
-- a separate device-registry table.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
