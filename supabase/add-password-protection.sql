-- Add Password Protection to Sites
-- 
-- This migration adds password protection functionality to sites.
-- Users can set a password to protect their published sites from public access.
--
-- SECURITY:
-- - Password is hashed using bcrypt (handled in application code)
-- - Only password_hash is stored in database (never plaintext)
-- - Password protection can be enabled/disabled per site
--
-- Run this after: schema.sql

-- Add password protection columns
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS password_protected boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS password_hash text;

-- Add index for performance (only on password-protected sites)
CREATE INDEX IF NOT EXISTS idx_sites_password_protected 
ON public.sites(password_protected) 
WHERE password_protected = true;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.password_protected IS 'Whether the site requires a password to access';
COMMENT ON COLUMN public.sites.password_hash IS 'Bcrypt hash of the site password (never store plaintext)';

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. password_protected: Boolean flag to enable/disable password protection
-- 2. password_hash: Bcrypt hash of the password (60 characters)
-- 3. When password_protected = false, password_hash should be NULL
-- 4. Password hashing is done in application code (server actions)
-- 5. Password verification is done in application code (server actions)
-- 6. RLS policies remain unchanged - password check happens at application level

