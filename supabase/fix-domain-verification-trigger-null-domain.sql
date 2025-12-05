-- ==========================================
-- Fix Domain Verification Trigger - Handle Null Domain
-- ==========================================
-- This migration fixes the trigger function to handle null domain values
-- when removing brand domains, preventing NOT NULL constraint violations
-- ==========================================

CREATE OR REPLACE FUNCTION public.log_domain_verification_change()
RETURNS TRIGGER
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
    -- Domain was verified (only log if new_domain is not null)
    IF new_verified AND NOT COALESCE(old_verified, false) AND new_domain IS NOT NULL THEN
      INSERT INTO public.domain_verification_history (
        workspace_id, domain, verified, verified_at, reason
      ) VALUES (
        NEW.id, new_domain, true, now(), 'Domain verified'
      );
    END IF;
    
    -- Domain was unverified (only log if we have a domain to log)
    IF NOT new_verified AND COALESCE(old_verified, false) THEN
      -- Use old_domain if new_domain is null (domain was removed)
      -- Use new_domain if it's not null (domain was unverified but still exists)
      IF new_domain IS NOT NULL THEN
        INSERT INTO public.domain_verification_history (
          workspace_id, domain, verified, unverified_at, reason
        ) VALUES (
          NEW.id, new_domain, false, now(), 'Domain unverified'
        );
      ELSIF old_domain IS NOT NULL THEN
        -- Domain was removed (new_domain is null) - use old_domain for the log entry
        INSERT INTO public.domain_verification_history (
          workspace_id, domain, verified, unverified_at, reason
        ) VALUES (
          NEW.id, old_domain, false, now(), 'Domain removed'
        );
      END IF;
    END IF;
    
    -- Domain was changed (only log if old_domain is not null and different from new)
    IF old_domain IS DISTINCT FROM new_domain AND old_domain IS NOT NULL THEN
      -- If new_domain is null, it means domain was removed
      IF new_domain IS NULL THEN
        INSERT INTO public.domain_verification_history (
          workspace_id, domain, verified, unverified_at, reason
        ) VALUES (
          NEW.id, old_domain, false, now(), 'Domain removed'
        );
      ELSE
        -- Domain was changed to a different domain
        INSERT INTO public.domain_verification_history (
          workspace_id, domain, verified, unverified_at, reason
        ) VALUES (
          NEW.id, old_domain, false, now(), 'Domain changed'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger is already created, just updating the function
-- No need to recreate the trigger

COMMENT ON FUNCTION public.log_domain_verification_change() IS 
'Log domain verification changes to history. Handles null domain values when domains are removed.';
