-- ==========================================
-- DNS Rebinding Protection for Brand Domains
-- ==========================================
-- This migration adds additional security checks for brand domains
-- to prevent DNS rebinding attacks and other hostname-based attacks.
--
-- PROTECTION MEASURES:
-- 1. Hostname validation - prevent IP addresses, localhost, internal IPs
-- 2. Subdomain takeover detection - track domain verification history
-- 3. Suspicious domain pattern detection
-- ==========================================

-- 1. Add domain_verification_history table to track changes
CREATE TABLE IF NOT EXISTS public.domain_verification_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  domain text NOT NULL,
  verified boolean NOT NULL,
  verified_at timestamp with time zone,
  unverified_at timestamp with time zone,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_domain_verification_history_workspace_domain 
ON public.domain_verification_history (workspace_id, domain, created_at DESC);

-- Enable RLS
ALTER TABLE public.domain_verification_history ENABLE ROW LEVEL SECURITY;

-- Only workspace owners and admins can view history
CREATE POLICY "Workspace owners and admins can view domain verification history"
ON public.domain_verification_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.workspace_id = domain_verification_history.workspace_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner', 'admin')
  )
);

-- 2. Function to validate hostname (used by middleware/RPC)
CREATE OR REPLACE FUNCTION public.is_valid_brand_domain(domain_name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Reject if null or empty
  IF domain_name IS NULL OR domain_name = '' THEN
    RETURN false;
  END IF;

  -- Normalize to lowercase
  domain_name := lower(trim(domain_name));

  -- Reject IP addresses (IPv4)
  IF domain_name ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN
    RETURN false;
  END IF;

  -- Reject IPv6 addresses (basic check)
  IF domain_name ~ ':' THEN
    RETURN false;
  END IF;

  -- Reject localhost and local TLDs
  IF domain_name IN ('localhost', 'localhost.localdomain') THEN
    RETURN false;
  END IF;

  IF domain_name ~ '\.(local|localhost|test|example|invalid)$' THEN
    RETURN false;
  END IF;

  -- Reject internal IP ranges (private networks)
  -- 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
  IF domain_name ~ '^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\.|^127\.' THEN
    RETURN false;
  END IF;

  -- Reject link-local addresses (169.254.0.0/16)
  IF domain_name ~ '^169\.254\.' THEN
    RETURN false;
  END IF;

  -- Must be a valid domain format
  IF NOT (domain_name ~ '^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$') THEN
    RETURN false;
  END IF;

  -- Must have at least 3 parts (subdomain.domain.tld)
  IF array_length(string_to_array(domain_name, '.'), 1) < 3 THEN
    RETURN false;
  END IF;

  -- Max 5 parts (prevent extremely deep subdomains)
  IF array_length(string_to_array(domain_name, '.'), 1) > 5 THEN
    RETURN false;
  END IF;

  -- Total length check (DNS spec)
  IF length(domain_name) > 253 THEN
    RETURN false;
  END IF;

  -- Each label must be max 63 characters
  IF EXISTS (
    SELECT 1 FROM unnest(string_to_array(domain_name, '.')) AS label
    WHERE length(label) > 63
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.is_valid_brand_domain(text) IS 
'Validate that a domain name is safe to use as a brand domain. Rejects IPs, localhost, and malformed domains.';

-- 3. Enhanced get_workspace_by_brand_domain with security checks
DROP FUNCTION IF EXISTS public.get_workspace_by_brand_domain(TEXT);

CREATE OR REPLACE FUNCTION public.get_workspace_by_brand_domain(domain_name TEXT)
RETURNS SETOF workspaces
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate domain format first (security check)
  IF NOT public.is_valid_brand_domain(domain_name) THEN
    -- Return empty set for invalid domains
    RETURN;
  END IF;

  -- Normalize domain (remove www prefix if present)
  domain_name := CASE 
    WHEN lower(domain_name) LIKE 'www.%' THEN substring(lower(domain_name) from 5)
    ELSE lower(domain_name)
  END;

  -- Return workspace only if domain is verified and valid
  RETURN QUERY
  SELECT w.*
  FROM workspaces w
  WHERE 
    w.deleted_at IS NULL
    AND (w.branding_config->>'custom_brand_domain') = domain_name
    AND (w.branding_config->>'custom_brand_domain_verified') = 'true'
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO anon;

COMMENT ON FUNCTION get_workspace_by_brand_domain(TEXT) IS 
'Get workspace by verified brand domain with security validation. Returns empty if domain is invalid or not verified.';

-- 4. Trigger to log domain verification changes
CREATE OR REPLACE FUNCTION public.log_domain_verification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_domain text;
  old_verified boolean;
  new_domain text;
  new_verified boolean;
BEGIN
  -- Extract old values
  old_domain := OLD.branding_config->>'custom_brand_domain';
  old_verified := (OLD.branding_config->>'custom_brand_domain_verified')::boolean;
  
  -- Extract new values
  new_domain := NEW.branding_config->>'custom_brand_domain';
  new_verified := (NEW.branding_config->>'custom_brand_domain_verified')::boolean;
  
  -- Log if domain changed or verification status changed
  IF (old_domain IS DISTINCT FROM new_domain) OR (old_verified IS DISTINCT FROM new_verified) THEN
    -- Domain was verified
    IF new_verified AND NOT COALESCE(old_verified, false) THEN
      INSERT INTO public.domain_verification_history (
        workspace_id, domain, verified, verified_at, reason
      ) VALUES (
        NEW.id, new_domain, true, now(), 'Domain verified'
      );
    END IF;
    
    -- Domain was unverified
    IF NOT new_verified AND COALESCE(old_verified, false) THEN
      INSERT INTO public.domain_verification_history (
        workspace_id, domain, verified, unverified_at, reason
      ) VALUES (
        NEW.id, new_domain, false, now(), 'Domain unverified'
      );
    END IF;
    
    -- Domain was changed
    IF old_domain IS DISTINCT FROM new_domain AND old_domain IS NOT NULL THEN
      INSERT INTO public.domain_verification_history (
        workspace_id, domain, verified, unverified_at, reason
      ) VALUES (
        NEW.id, old_domain, false, now(), 'Domain changed'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS log_domain_verification_change_trigger ON public.workspaces;
CREATE TRIGGER log_domain_verification_change_trigger
  AFTER UPDATE OF branding_config ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.log_domain_verification_change();

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. All brand domains are validated to prevent:
--    - DNS rebinding attacks (rejects IPs, localhost, internal IPs)
--    - Subdomain takeover (tracks verification history)
--    - Malformed domains
-- 2. Domain verification history is logged for audit trail
-- 3. get_workspace_by_brand_domain now includes security validation
-- 4. Use is_valid_brand_domain() in any custom domain validation logic
-- ==========================================
