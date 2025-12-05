-- ==========================================
-- SETUP CRON JOB FOR CLEANUP EXPIRED PREVIEWS
-- ==========================================
-- Creates a daily cron job to cleanup expired temp_previews
-- Runs at 2:00 AM UTC every day
-- ==========================================

-- First, ensure pg_cron extension is enabled
-- Note: In Supabase, pg_cron might need to be enabled by support
-- If this fails, contact Supabase support to enable pg_cron extension
create extension if not exists pg_cron;

-- Drop existing job if it exists (to allow re-running this script)
select cron.unschedule('cleanup-expired-previews') where exists (
  select 1 from cron.job where jobname = 'cleanup-expired-previews'
);

-- Create the cron job
-- Schedule: '0 2 * * *' = Every day at 2:00 AM UTC
-- This calls the cleanup_expired_previews() function
select cron.schedule(
  'cleanup-expired-previews',                    -- Job name
  '0 2 * * *',                                   -- Cron schedule: Daily at 2:00 AM UTC
  $$select public.cleanup_expired_previews()$$   -- SQL to execute
);

-- Verify the job was created
select 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
from cron.job 
where jobname = 'cleanup-expired-previews';

-- Add comment
comment on extension pg_cron is 'Extension for scheduling periodic jobs. Used for cleanup_expired_previews() daily at 2 AM UTC.';

-- ==========================================
-- ALTERNATIVE SCHEDULES (if you want to change):
-- ==========================================
-- Every hour: '0 * * * *'
-- Every 6 hours: '0 */6 * * *'
-- Every day at midnight: '0 0 * * *'
-- Every day at 2 AM: '0 2 * * *' (current)
-- Every day at 3 AM: '0 3 * * *'
-- ==========================================

-- ==========================================
-- USEFUL COMMANDS:
-- ==========================================
-- View all cron jobs:
--   SELECT * FROM cron.job;
--
-- View job execution history:
--   SELECT * FROM cron.job_run_details 
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-previews')
--   ORDER BY start_time DESC LIMIT 10;
--
-- Manually trigger the job:
--   SELECT cron.schedule('cleanup-expired-previews', '0 2 * * *', $$select public.cleanup_expired_previews()$$);
--
-- Remove the job:
--   SELECT cron.unschedule('cleanup-expired-previews');
-- ==========================================
