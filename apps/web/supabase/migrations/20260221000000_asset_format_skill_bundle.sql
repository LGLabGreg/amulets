-- Rename 'package' → 'skill', allow 'bundle', drop 'type' column
-- Safe: the old push command hard-failed on directories without SKILL.md,
-- so all existing 'package' rows are genuine skills.

-- Step 1: update existing 'package' rows to 'skill'
UPDATE public.assets SET asset_format = 'skill' WHERE asset_format = 'package';

-- Step 2: drop the old check constraint and add the new one
ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_asset_format_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_asset_format_check
  CHECK (asset_format IN ('file', 'skill', 'bundle'));

-- Step 3: drop the type column
ALTER TABLE public.assets DROP COLUMN IF EXISTS type;
