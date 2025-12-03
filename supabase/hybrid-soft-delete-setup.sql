-- ==========================================
-- HYBRID SOFT DELETE SETUP
-- ==========================================
-- Implements a hybrid approach: soft delete + automatic hard delete after 90 days
-- 
-- Strategy:
-- 1. Soft delete as default (deleted_at + RLS)
-- 2. All SELECTs filter by WHERE deleted_at IS NULL
-- 3. Background hard delete after 90 days (cron job)
-- 4. Partial indexes only on active rows (deleted_at IS NULL)
-- 
-- Benefits:
-- - Allows "oops, I deleted by mistake" recovery (90 days window)
-- - Keeps database size manageable (automatic cleanup)
-- - Fast queries (partial indexes on active rows only)
-- - Support/debug window (90 days)
-- ==========================================

-- ==========================================
-- 1. PARTIAL INDEXES FOR ACTIVE ROWS
-- ==========================================
-- These indexes only include rows where deleted_at IS NULL
-- This keeps indexes small and fast, ignoring deleted rows

-- Index for sites.deleted_at (used in WHERE deleted_at IS NULL filters)
-- This speeds up all queries that filter out deleted sites
CREATE INDEX IF NOT EXISTS idx_sites_deleted_at 
ON public.sites(deleted_at) 
WHERE deleted_at IS NULL;

-- Composite index for common query pattern: workspace_id + deleted_at
-- Used in: WHERE workspace_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_sites_workspace_id_deleted_at 
ON public.sites(workspace_id, deleted_at) 
WHERE deleted_at IS NULL;

-- Composite index for creator_id queries
-- Used in: WHERE creator_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_sites_creator_id_deleted_at 
ON public.sites(creator_id, deleted_at) 
WHERE deleted_at IS NULL;

-- Composite index for assigned_agent_id queries
-- Used in: WHERE assigned_agent_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_sites_assigned_agent_id_deleted_at 
ON public.sites(assigned_agent_id, deleted_at) 
WHERE deleted_at IS NULL;

-- Index for workspaces.slug (unique constraint should already be partial)
-- If not partial, this ensures it only indexes active workspaces
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_unique_active
ON public.workspaces(slug)
WHERE deleted_at IS NULL;

-- Index for workspaces.deleted_at (if not already exists from add-performance-indexes.sql)
-- This is already created in add-performance-indexes.sql, but adding IF NOT EXISTS for safety
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at 
ON public.workspaces(deleted_at) 
WHERE deleted_at IS NULL;

-- Index for profiles.deleted_at (if not already exists from add-performance-indexes.sql)
-- This is already created in add-performance-indexes.sql, but adding IF NOT EXISTS for safety
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at 
ON public.profiles(deleted_at) 
WHERE deleted_at IS NULL;

-- ==========================================
-- 2. HARD DELETE FUNCTION
-- ==========================================
-- Function to permanently delete rows that were soft-deleted more than X days ago
-- This function is safe to call manually or via cron job

CREATE OR REPLACE FUNCTION public.hard_delete_old_soft_deleted_rows(
  retention_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  table_name TEXT,
  deleted_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sites_count BIGINT;
  workspaces_count BIGINT;
  profiles_count BIGINT;
BEGIN
  -- Hard delete sites that were soft-deleted more than retention_days ago
  DELETE FROM public.sites
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS sites_count = ROW_COUNT;
  
  -- Hard delete workspaces that were soft-deleted more than retention_days ago
  -- Note: This will cascade delete memberships, sites, etc. due to ON DELETE CASCADE
  DELETE FROM public.workspaces
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS workspaces_count = ROW_COUNT;
  
  -- Hard delete profiles that were soft-deleted more than retention_days ago
  -- Note: This will cascade delete auth.users if cascade is set up
  DELETE FROM public.profiles
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS profiles_count = ROW_COUNT;
  
  -- Return summary
  RETURN QUERY SELECT 'sites'::TEXT, sites_count;
  RETURN QUERY SELECT 'workspaces'::TEXT, workspaces_count;
  RETURN QUERY SELECT 'profiles'::TEXT, profiles_count;
END;
$$;

-- Grant execute permission to authenticated users (or service role)
-- In production, you might want to restrict this to service role only
GRANT EXECUTE ON FUNCTION public.hard_delete_old_soft_deleted_rows(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_old_soft_deleted_rows(INTEGER) TO service_role;

-- ==========================================
-- 3. CRON JOB SETUP (pg_cron)
-- ==========================================
-- Set up automatic cleanup job that runs daily at 2 AM UTC
-- This will hard delete rows that were soft-deleted more than 90 days ago

-- Enable pg_cron extension (if not already enabled)
-- Note: In Supabase, pg_cron extension might need to be enabled via Dashboard
-- Go to: Database → Extensions → Enable "pg_cron"
-- Or run: CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  -- Try to enable pg_cron extension
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron extension requires superuser privileges. Please enable it via Supabase Dashboard: Database → Extensions → Enable "pg_cron"';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not enable pg_cron extension. Error: %. Please enable it manually via Supabase Dashboard.', SQLERRM;
END $$;

-- Schedule the cleanup job (only if pg_cron is available)
-- Runs daily at 2:00 AM UTC
-- Adjust the schedule as needed (cron format: minute hour day month weekday)
DO $$
DECLARE
  job_id BIGINT;
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule if already exists (for re-running this migration)
    BEGIN
      PERFORM cron.unschedule('hard-delete-old-soft-deleted-rows');
    EXCEPTION
      WHEN OTHERS THEN
        -- Job doesn't exist yet, that's fine
        NULL;
    END;
    
    -- Schedule the cleanup job
    -- cron.schedule returns the job ID, so we need to SELECT it
    SELECT cron.schedule(
      'hard-delete-old-soft-deleted-rows',
      '0 2 * * *', -- Daily at 2:00 AM UTC
      'SELECT public.hard_delete_old_soft_deleted_rows(90);'
    ) INTO job_id;
    
    RAISE NOTICE 'Cron job scheduled successfully: hard-delete-old-soft-deleted-rows (job_id: %, runs daily at 2:00 AM UTC)', job_id;
  ELSE
    RAISE NOTICE 'pg_cron extension is not enabled. Please enable it via Supabase Dashboard, then run: SELECT cron.schedule(''hard-delete-old-soft-deleted-rows'', ''0 2 * * *'', ''SELECT public.hard_delete_old_soft_deleted_rows(90);'');';
  END IF;
END $$;

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. Partial indexes only index active rows (deleted_at IS NULL)
--    - Keeps indexes small and fast
--    - Query planner works mainly with active rows
--    - Deleted rows don't slow down queries
--
-- 2. Hard delete function:
--    - Default retention: 90 days
--    - Can be called manually: SELECT * FROM public.hard_delete_old_soft_deleted_rows(90);
--    - Returns summary of deleted rows per table
--    - Safe to run multiple times (idempotent)
--
-- 3. Cron job:
--    - Runs daily at 2:00 AM UTC
--    - Hard deletes rows soft-deleted more than 90 days ago
--    - Adjust schedule if needed: cron.unschedule('hard-delete-old-soft-deleted-rows')
--    - To change retention period, update the function call in cron.schedule
--
-- 4. Manual cleanup (if needed):
--    -- Run cleanup manually
--    SELECT * FROM public.hard_delete_old_soft_deleted_rows(90);
--
--    -- Check how many rows will be deleted (without actually deleting)
--    SELECT 
--      'sites' as table_name,
--      COUNT(*) as will_be_deleted
--    FROM public.sites
--    WHERE deleted_at IS NOT NULL
--      AND deleted_at < now() - interval '90 days';
--
-- 5. Monitoring:
--    -- Check cron job status
--    SELECT * FROM cron.job WHERE jobname = 'hard-delete-old-soft-deleted-rows';
--
--    -- Check cron job run history
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'hard-delete-old-soft-deleted-rows')
--    ORDER BY start_time DESC
--    LIMIT 10;
--
-- 6. Adjusting retention period:
--    -- To change from 90 to 30 days, update the cron job:
--    SELECT cron.unschedule('hard-delete-old-soft-deleted-rows');
--    SELECT cron.schedule(
--      'hard-delete-old-soft-deleted-rows',
--      '0 2 * * *',
--      $$ SELECT public.hard_delete_old_soft_deleted_rows(30); $$
--    );
--
-- 7. Disabling cron job (if needed):
--    SELECT cron.unschedule('hard-delete-old-soft-deleted-rows');

-- ==========================================
-- VERIFICATION:
-- ==========================================
-- After running this migration, verify:
--
-- 1. Indexes were created:
--    SELECT indexname, indexdef 
--    FROM pg_indexes 
--    WHERE tablename IN ('sites', 'workspaces', 'profiles')
--      AND indexdef LIKE '%deleted_at IS NULL%';
--
-- 2. Function was created:
--    SELECT proname, prosrc 
--    FROM pg_proc 
--    WHERE proname = 'hard_delete_old_soft_deleted_rows';
--
-- 3. Cron job was scheduled:
--    SELECT * FROM cron.job WHERE jobname = 'hard-delete-old-soft-deleted-rows';
--
-- 4. Test the function manually:
--    SELECT * FROM public.hard_delete_old_soft_deleted_rows(90);

