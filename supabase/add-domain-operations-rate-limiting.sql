-- ==========================================
-- Domain Operations Rate Limiting & Audit Log
-- ==========================================
-- This migration adds rate limiting and audit logging for brand domain operations.
--
-- FEATURES:
-- - Rate limiting for set/verify/remove operations
-- - Audit log for all domain operations (success and failures)
-- - Automatic cleanup of old logs (30 days retention)
-- ==========================================

-- 1. Create domain_operations_log table
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_operations_workspace_type_created 
ON public.domain_operations_log (workspace_id, operation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_operations_created_at 
ON public.domain_operations_log (created_at DESC);

-- 2. Enable RLS on domain_operations_log
ALTER TABLE public.domain_operations_log ENABLE ROW LEVEL SECURITY;

-- Only workspace owners and admins can view their workspace's logs
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

-- No user can directly insert/update/delete (only via RPC functions)
CREATE POLICY "No direct insert" ON public.domain_operations_log
FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update" ON public.domain_operations_log
FOR UPDATE USING (false);

CREATE POLICY "No direct delete" ON public.domain_operations_log
FOR DELETE USING (false);

-- 3. Function to check rate limit
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
  -- Set limits based on operation type
  CASE p_operation_type
    WHEN 'set' THEN
      v_limit := 5;
      v_window_minutes := 60; -- 5 attempts per hour
    WHEN 'verify' THEN
      v_limit := 10;
      v_window_minutes := 60; -- 10 attempts per hour
    WHEN 'remove' THEN
      v_limit := 3;
      v_window_minutes := 1440; -- 3 attempts per day (24 hours)
    ELSE
      RAISE EXCEPTION 'Invalid operation type: %', p_operation_type;
  END CASE;

  -- Calculate window start time
  v_reset_time := now() - (v_window_minutes || ' minutes')::interval;

  -- Count operations in the time window
  SELECT COUNT(*)
  INTO v_count
  FROM public.domain_operations_log
  WHERE workspace_id = p_workspace_id
    AND operation_type = p_operation_type
    AND created_at >= v_reset_time;

  -- Calculate minutes until reset
  IF v_count >= v_limit THEN
    -- Find the oldest operation in the window
    SELECT EXTRACT(EPOCH FROM (
      (SELECT created_at FROM public.domain_operations_log
       WHERE workspace_id = p_workspace_id
         AND operation_type = p_operation_type
         AND created_at >= v_reset_time
       ORDER BY created_at ASC
       LIMIT 1) + (v_window_minutes || ' minutes')::interval - now()
    )) / 60 INTO v_reset_in_minutes;
    
    -- Ensure at least 1 minute
    v_reset_in_minutes := GREATEST(1, CEIL(v_reset_in_minutes));
  ELSE
    v_reset_in_minutes := 0;
  END IF;

  -- Return result as JSON
  RETURN jsonb_build_object(
    'allowed', v_count < v_limit,
    'current', v_count,
    'limit', v_limit,
    'reset_in_minutes', v_reset_in_minutes
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_domain_operation_rate_limit(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.check_domain_operation_rate_limit(uuid, text) IS 
'Check if domain operation is allowed based on rate limits. Returns JSON with allowed status and details.';

-- 4. Function to log domain operation
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
  -- Insert log entry
  INSERT INTO public.domain_operations_log (
    workspace_id,
    user_id,
    operation_type,
    domain,
    success,
    error_message
  ) VALUES (
    p_workspace_id,
    p_user_id,
    p_operation_type,
    p_domain,
    p_success,
    p_error_message
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.log_domain_operation(uuid, uuid, text, text, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.log_domain_operation(uuid, uuid, text, text, boolean, text) IS 
'Log a domain operation for audit and rate limiting purposes.';

-- 5. Function to cleanup old logs (run periodically via cron or pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_domain_operation_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- Delete logs older than 30 days
  DELETE FROM public.domain_operations_log
  WHERE created_at < now() - interval '30 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

-- Grant execute to postgres user for cron job
GRANT EXECUTE ON FUNCTION public.cleanup_old_domain_operation_logs() TO postgres;

COMMENT ON FUNCTION public.cleanup_old_domain_operation_logs() IS 
'Cleanup domain operation logs older than 30 days. Returns number of deleted rows.';

-- 6. Optional: Create a view for easier querying of recent operations
CREATE OR REPLACE VIEW public.recent_domain_operations AS
SELECT 
  dol.id,
  dol.workspace_id,
  w.name as workspace_name,
  dol.user_id,
  p.email as user_email,
  p.full_name as user_name,
  dol.operation_type,
  dol.domain,
  dol.success,
  dol.error_message,
  dol.created_at
FROM public.domain_operations_log dol
LEFT JOIN public.workspaces w ON w.id = dol.workspace_id
LEFT JOIN public.profiles p ON p.id = dol.user_id
WHERE dol.created_at > now() - interval '7 days'
ORDER BY dol.created_at DESC;

-- RLS for view - same as table
ALTER VIEW public.recent_domain_operations SET (security_invoker = on);

-- Grant select on view
GRANT SELECT ON public.recent_domain_operations TO authenticated;

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. Rate limits:
--    - set: 5 attempts per hour
--    - verify: 10 attempts per hour
--    - remove: 3 attempts per day
-- 2. Logs are kept for 30 days, then automatically cleaned up
-- 3. All operations are logged (success and failures) for audit
-- 4. RLS ensures only workspace owners/admins can view logs
-- 5. To manually cleanup old logs, run: SELECT cleanup_old_domain_operation_logs();
-- ==========================================

-- ==========================================
-- SETUP INSTRUCTIONS:
-- ==========================================
-- 1. Run this migration in Supabase SQL Editor
-- 2. Optional: Set up pg_cron to run cleanup daily
--    Example (requires pg_cron extension):
--    SELECT cron.schedule(
--      'cleanup-domain-logs',
--      '0 2 * * *', -- 2 AM daily
--      'SELECT cleanup_old_domain_operation_logs()'
--    );
-- ==========================================
