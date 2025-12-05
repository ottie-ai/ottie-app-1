-- ==========================================
-- Increase Domain Rate Limit to 50
-- ==========================================
-- This migration increases the rate limit for all domain operations to 50
-- ==========================================

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
      v_limit := 50;  -- Increased from 5 to 50
      v_window_minutes := 60; -- 50 attempts per hour
    WHEN 'verify' THEN
      v_limit := 50;  -- Increased from 10 to 50
      v_window_minutes := 60; -- 50 attempts per hour
    WHEN 'remove' THEN
      v_limit := 50;  -- Increased from 3 to 50
      v_window_minutes := 1440; -- 50 attempts per day (24 hours)
    ELSE
      RAISE EXCEPTION 'Invalid operation type: %', p_operation_type;
  END CASE;

  -- Calculate window start time
  v_reset_time := now() - (v_window_minutes || ' minutes')::interval;

  -- Count only SUCCESSFUL operations in the time window
  -- This prevents failed operations (due to bugs/errors) from counting against the limit
  SELECT COUNT(*)
  INTO v_count
  FROM public.domain_operations_log
  WHERE workspace_id = p_workspace_id
    AND operation_type = p_operation_type
    AND success = true  -- Only count successful operations
    AND created_at >= v_reset_time;

  -- Calculate minutes until reset
  IF v_count >= v_limit THEN
    -- Find the oldest successful operation in the window
    SELECT EXTRACT(EPOCH FROM (
      (SELECT created_at FROM public.domain_operations_log
       WHERE workspace_id = p_workspace_id
         AND operation_type = p_operation_type
         AND success = true  -- Only count successful operations
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

GRANT EXECUTE ON FUNCTION public.check_domain_operation_rate_limit(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.check_domain_operation_rate_limit(uuid, text) IS 
'Check rate limit for domain operations. Rate limit increased to 50 for all operations. Only counts successful operations to prevent failed operations (due to bugs/errors) from counting against the limit.';
