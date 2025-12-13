-- ==========================================
-- Brand Domain Cleanup Cron Job
-- ==========================================
-- This script sets up a cron job to automatically cleanup
-- orphaned brand domains for deleted workspaces.
--
-- PREREQUISITE: pg_cron extension must be enabled
-- ==========================================

-- 1. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create a SQL function wrapper for the cleanup
-- This allows us to call the cleanup from a cron job
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_brand_domains_cron()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_workspaces uuid[];
  v_workspace_id uuid;
  v_branding_config jsonb;
  v_domain text;
  v_cleaned_count integer := 0;
  v_error_count integer := 0;
BEGIN
  -- Find all soft-deleted workspaces with brand domains
  SELECT array_agg(id)
  INTO v_deleted_workspaces
  FROM public.workspaces
  WHERE deleted_at IS NOT NULL
    AND branding_config->>'custom_brand_domain' IS NOT NULL;
  
  -- If no workspaces to clean up, return early
  IF v_deleted_workspaces IS NULL OR array_length(v_deleted_workspaces, 1) = 0 THEN
    RAISE NOTICE '[Brand Domain Cleanup] No orphaned domains found';
    RETURN jsonb_build_object(
      'success', true,
      'cleaned_count', 0,
      'error_count', 0,
      'message', 'No orphaned domains found'
    );
  END IF;
  
  RAISE NOTICE '[Brand Domain Cleanup] Found % deleted workspace(s) with brand domains', array_length(v_deleted_workspaces, 1);
  
  -- Process each workspace
  FOREACH v_workspace_id IN ARRAY v_deleted_workspaces
  LOOP
    BEGIN
      -- Get current config
      SELECT branding_config
      INTO v_branding_config
      FROM public.workspaces
      WHERE id = v_workspace_id;
      
      -- Get domain
      v_domain := v_branding_config->>'custom_brand_domain';
      
      IF v_domain IS NOT NULL THEN
        RAISE NOTICE '[Brand Domain Cleanup] Clearing domain % for workspace %', v_domain, v_workspace_id;
        
        -- Clear brand domain from config
        -- Note: Actual Vercel domain removal must be done via API (handled by server action)
        UPDATE public.workspaces
        SET branding_config = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(branding_config, '{}'::jsonb),
                  '{custom_brand_domain}', 'null'::jsonb
                ),
                '{custom_brand_domain_verified}', 'false'::jsonb
              ),
              '{custom_brand_domain_verified_at}', 'null'::jsonb
            ),
            '{custom_brand_domain_vercel_added}', 'false'::jsonb
          ),
          '{custom_brand_domain_vercel_dns_instructions}', 'null'::jsonb
        )
        WHERE id = v_workspace_id;
        
        v_cleaned_count := v_cleaned_count + 1;
        RAISE NOTICE '[Brand Domain Cleanup] Successfully cleared workspace %', v_workspace_id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING '[Brand Domain Cleanup] Error cleaning workspace %: %', v_workspace_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '[Brand Domain Cleanup] Cleanup complete. Cleaned: %, Errors: %', v_cleaned_count, v_error_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'error_count', v_error_count,
    'timestamp', now()
  );
END;
$$;

-- Grant execute to postgres user for cron job
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_brand_domains_cron() TO postgres;

COMMENT ON FUNCTION public.cleanup_orphaned_brand_domains_cron() IS 
'Cleanup orphaned brand domains for soft-deleted workspaces. Clears domain config from database.
Note: Vercel domain removal is handled by the Next.js server action cleanupOrphanedBrandDomains()';

-- 3. Schedule the cron job to run daily at 3 AM
-- Note: This will create a new cron job. Check existing jobs first with: SELECT * FROM cron.job;
DO $$
BEGIN
  -- Check if the job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-orphaned-brand-domains'
  ) THEN
    -- Create the cron job
    PERFORM cron.schedule(
      'cleanup-orphaned-brand-domains',
      '0 3 * * *', -- Every day at 3 AM
      'SELECT public.cleanup_orphaned_brand_domains_cron()'
    );
    RAISE NOTICE 'Cron job "cleanup-orphaned-brand-domains" created successfully';
  ELSE
    RAISE NOTICE 'Cron job "cleanup-orphaned-brand-domains" already exists';
  END IF;
END $$;

-- ==========================================
-- VERIFICATION & MANAGEMENT
-- ==========================================

-- View scheduled cron jobs
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-orphaned-brand-domains';

-- View cron job execution history
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-orphaned-brand-domains')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Manually run the cleanup function
-- SELECT public.cleanup_orphaned_brand_domains_cron();

-- Unschedule the cron job (if needed)
-- SELECT cron.unschedule('cleanup-orphaned-brand-domains');

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. This SQL function only clears the database config
-- 2. Actual Vercel domain removal requires API calls
-- 3. For complete cleanup, also call the Next.js server action:
--    cleanupOrphanedBrandDomains() periodically
-- 4. Consider setting up a webhook or scheduled task in your
--    deployment platform to call the server action
-- ==========================================
