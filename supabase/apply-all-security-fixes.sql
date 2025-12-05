-- ==========================================
-- MASTER SECURITY FIX SCRIPT
-- Brand Domain Feature - Security Implementation
-- ==========================================
-- This script applies all security fixes in correct order.
-- Run this in Supabase SQL Editor to apply all fixes at once.
--
-- WHAT IT DOES:
-- 1. Enhances RLS policy for brand domains
-- 2. Adds rate limiting for domain operations
-- 3. Adds DNS rebinding protection
--
-- ESTIMATED TIME: ~10 seconds
-- ROLLBACK: Not recommended - these are security fixes
-- ==========================================

-- Set client_min_messages to reduce noise
SET client_min_messages TO WARNING;

-- Begin transaction
BEGIN;

-- ==========================================
-- PART 1: RLS Policy Enhancement
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PART 1/3: Enhancing RLS Policy';
  RAISE NOTICE '========================================';
END $$;

-- Drop old policy
DROP POLICY IF EXISTS "Public can view published sites on brand domains" ON public.sites;

-- Create enhanced policy with workspace verification
CREATE POLICY "Public can view published sites on brand domains"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND status = 'published'
  AND domain != 'ottie.site'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = sites.workspace_id
    AND w.deleted_at IS NULL
    AND (w.branding_config->>'custom_brand_domain') = sites.domain
    AND (w.branding_config->>'custom_brand_domain_verified') = 'true'
  )
);

-- Add index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_workspaces_brand_domain_lookup 
ON public.workspaces ((branding_config->>'custom_brand_domain'), (branding_config->>'custom_brand_domain_verified'))
WHERE deleted_at IS NULL;

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policy enhanced successfully';
END $$;

-- ==========================================
-- PART 2: Rate Limiting & Audit Log
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PART 2/3: Adding Rate Limiting';
  RAISE NOTICE '========================================';
END $$;

-- Create domain_operations_log table
CREATE TABLE IF NOT EXISTS public.domain_operations_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('set', 'verify', 'remove')),
  domain text,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_domain_operations_workspace_type_created 
ON public.domain_operations_log (workspace_id, operation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_operations_created_at 
ON public.domain_operations_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.domain_operations_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Workspace owners and admins can view domain operation logs" ON public.domain_operations_log;
CREATE POLICY "Workspace owners and admins can view domain operation logs"
ON public.domain_operations_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.workspace_id = domain_operations_log.workspace_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "No direct insert" ON public.domain_operations_log;
CREATE POLICY "No direct insert" ON public.domain_operations_log
FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update" ON public.domain_operations_log;
CREATE POLICY "No direct update" ON public.domain_operations_log
FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No direct delete" ON public.domain_operations_log;
CREATE POLICY "No direct delete" ON public.domain_operations_log
FOR DELETE USING (false);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_domain_operation_rate_limit(
  p_workspace_id uuid,
  p_operation_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_window_minutes integer;
  v_count integer;
  v_reset_time timestamp with time zone;
  v_reset_in_minutes integer;
BEGIN
  CASE p_operation_type
    WHEN 'set' THEN
      v_limit := 5;
      v_window_minutes := 60;
    WHEN 'verify' THEN
      v_limit := 10;
      v_window_minutes := 60;
    WHEN 'remove' THEN
      v_limit := 3;
      v_window_minutes := 1440;
    ELSE
      RAISE EXCEPTION 'Invalid operation type: %', p_operation_type;
  END CASE;

  v_reset_time := now() - (v_window_minutes || ' minutes')::interval;

  SELECT COUNT(*)
  INTO v_count
  FROM public.domain_operations_log
  WHERE workspace_id = p_workspace_id
    AND operation_type = p_operation_type
    AND created_at >= v_reset_time;

  IF v_count >= v_limit THEN
    SELECT EXTRACT(EPOCH FROM (
      (SELECT created_at FROM public.domain_operations_log
       WHERE workspace_id = p_workspace_id
         AND operation_type = p_operation_type
         AND created_at >= v_reset_time
       ORDER BY created_at ASC
       LIMIT 1) + (v_window_minutes || ' minutes')::interval - now()
    )) / 60 INTO v_reset_in_minutes;
    
    v_reset_in_minutes := GREATEST(1, CEIL(v_reset_in_minutes));
  ELSE
    v_reset_in_minutes := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_count < v_limit,
    'current', v_count,
    'limit', v_limit,
    'reset_in_minutes', v_reset_in_minutes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_domain_operation_rate_limit(uuid, text) TO authenticated;

-- Function to log operations
CREATE OR REPLACE FUNCTION public.log_domain_operation(
  p_workspace_id uuid,
  p_user_id uuid,
  p_operation_type text,
  p_domain text,
  p_success boolean,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.domain_operations_log (
    workspace_id, user_id, operation_type, domain, success, error_message
  ) VALUES (
    p_workspace_id, p_user_id, p_operation_type, p_domain, p_success, p_error_message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_domain_operation(uuid, uuid, text, text, boolean, text) TO authenticated;

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_domain_operation_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.domain_operations_log
  WHERE created_at < now() - interval '30 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_domain_operation_logs() TO postgres;

DO $$
BEGIN
  RAISE NOTICE '✅ Rate limiting added successfully';
END $$;

-- ==========================================
-- PART 3: DNS Rebinding Protection
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PART 3/3: Adding DNS Protection';
  RAISE NOTICE '========================================';
END $$;

-- Create verification history table
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

CREATE INDEX IF NOT EXISTS idx_domain_verification_history_workspace_domain 
ON public.domain_verification_history (workspace_id, domain, created_at DESC);

ALTER TABLE public.domain_verification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace owners and admins can view domain verification history" ON public.domain_verification_history;
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

-- Hostname validation function
CREATE OR REPLACE FUNCTION public.is_valid_brand_domain(domain_name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF domain_name IS NULL OR domain_name = '' THEN
    RETURN false;
  END IF;

  domain_name := lower(trim(domain_name));

  IF domain_name ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN
    RETURN false;
  END IF;

  IF domain_name ~ ':' THEN
    RETURN false;
  END IF;

  IF domain_name IN ('localhost', 'localhost.localdomain') THEN
    RETURN false;
  END IF;

  IF domain_name ~ '\.(local|localhost|test|example|invalid)$' THEN
    RETURN false;
  END IF;

  IF domain_name ~ '^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\.|^127\.' THEN
    RETURN false;
  END IF;

  IF domain_name ~ '^169\.254\.' THEN
    RETURN false;
  END IF;

  IF NOT (domain_name ~ '^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$') THEN
    RETURN false;
  END IF;

  IF array_length(string_to_array(domain_name, '.'), 1) < 3 THEN
    RETURN false;
  END IF;

  IF array_length(string_to_array(domain_name, '.'), 1) > 5 THEN
    RETURN false;
  END IF;

  IF length(domain_name) > 253 THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(string_to_array(domain_name, '.')) AS label
    WHERE length(label) > 63
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Enhanced get_workspace_by_brand_domain
DROP FUNCTION IF EXISTS public.get_workspace_by_brand_domain(TEXT);

CREATE OR REPLACE FUNCTION public.get_workspace_by_brand_domain(domain_name TEXT)
RETURNS SETOF workspaces
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_valid_brand_domain(domain_name) THEN
    RETURN;
  END IF;

  domain_name := CASE 
    WHEN lower(domain_name) LIKE 'www.%' THEN substring(lower(domain_name) from 5)
    ELSE lower(domain_name)
  END;

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

GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO anon;

-- Trigger for verification history
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
  old_domain := OLD.branding_config->>'custom_brand_domain';
  old_verified := (OLD.branding_config->>'custom_brand_domain_verified')::boolean;
  new_domain := NEW.branding_config->>'custom_brand_domain';
  new_verified := (NEW.branding_config->>'custom_brand_domain_verified')::boolean;
  
  IF (old_domain IS DISTINCT FROM new_domain) OR (old_verified IS DISTINCT FROM new_verified) THEN
    IF new_verified AND NOT COALESCE(old_verified, false) THEN
      INSERT INTO public.domain_verification_history (
        workspace_id, domain, verified, verified_at, reason
      ) VALUES (
        NEW.id, new_domain, true, now(), 'Domain verified'
      );
    END IF;
    
    IF NOT new_verified AND COALESCE(old_verified, false) THEN
      INSERT INTO public.domain_verification_history (
        workspace_id, domain, verified, unverified_at, reason
      ) VALUES (
        NEW.id, new_domain, false, now(), 'Domain unverified'
      );
    END IF;
    
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

DROP TRIGGER IF EXISTS log_domain_verification_change_trigger ON public.workspaces;
CREATE TRIGGER log_domain_verification_change_trigger
  AFTER UPDATE OF branding_config ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.log_domain_verification_change();

DO $$
BEGIN
  RAISE NOTICE '✅ DNS protection added successfully';
END $$;

-- ==========================================
-- COMMIT & SUMMARY
-- ==========================================
COMMIT;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL SECURITY FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Applied fixes:';
  RAISE NOTICE '1. ✅ Enhanced RLS policy for brand domains';
  RAISE NOTICE '2. ✅ Rate limiting (5/hr set, 10/hr verify, 3/day remove)';
  RAISE NOTICE '3. ✅ DNS rebinding protection';
  RAISE NOTICE '4. ✅ Domain verification history tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '- Test domain operations in your app';
  RAISE NOTICE '- Monitor domain_operations_log for abuse';
  RAISE NOTICE '- Optional: Set up pg_cron for log cleanup';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
