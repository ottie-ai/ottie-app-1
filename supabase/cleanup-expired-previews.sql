-- ==========================================
-- CLEANUP FUNCTION: DELETE EXPIRED PREVIEWS
-- ==========================================
-- Scheduled function to delete expired temp_previews
-- Run this daily via Supabase cron or pg_cron
-- ==========================================

-- Function to cleanup expired previews
-- Note: Image cleanup is handled by server-side function, not SQL
create or replace function public.cleanup_expired_previews()
returns table(deleted_count bigint)
language plpgsql
security definer
as $$
declare
  deleted_count bigint;
begin
  -- Delete expired previews
  -- Images will be cleaned up by server-side cleanup function
  with deleted as (
    delete from public.temp_previews
    where expires_at < now()
    returning id
  )
  select count(*) into deleted_count from deleted;
  
  return query select deleted_count;
end;
$$;

-- Grant execute permission
grant execute on function public.cleanup_expired_previews() to service_role;

-- Add comment
comment on function public.cleanup_expired_previews() is 'Deletes expired temp_previews. Should be run daily via cron.';

-- ==========================================
-- OPTIONAL: Set up pg_cron job (if available)
-- ==========================================
-- Uncomment if you have pg_cron extension enabled:
--
-- select cron.schedule(
--   'cleanup-expired-previews',
--   '0 2 * * *', -- Run daily at 2 AM UTC
--   $$select public.cleanup_expired_previews()$$
-- );
