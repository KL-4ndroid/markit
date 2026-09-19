-- Add owner brand display name to user settings.
-- Safety:
-- - nullable column only;
-- - no existing data rewrite;
-- - no RLS policy changes;
-- - existing user_settings rows remain valid.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS brand_name TEXT;

COMMENT ON COLUMN public.user_settings.brand_name IS 'Owner brand display name used on owner home and settlement reports';
