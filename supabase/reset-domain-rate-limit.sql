-- ==========================================
-- Reset Domain Rate Limit Function
-- ==========================================
-- Allows workspace owners/admins to reset their rate limit
-- by removing failed operations from the log
-- ==========================================

CREATE OR REPLACE FUNCTION public.reset_domain_operation_rate_limit(
  p_workspace_id uuid,
  p_operation_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_membership_role text;
  v_deleted_count integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is owner or admin of the workspace
  SELECT role INTO v_membership_role
  FROM public.memberships
  WHERE workspace_id = p_workspace_id
    AND user_id = v_user_id;

  IF v_membership_role IS NULL OR (v_membership_role NOT IN ('owner', 'admin')) THEN
    RAISE EXCEPTION 'Only workspace owners and admins can reset rate limit';
  END IF;

  -- Validate operation type
  IF p_operation_type NOT IN ('set', 'verify', 'remove') THEN
    RAISE EXCEPTION 'Invalid operation type: %', p_operation_type;
  END IF;

  -- Delete only failed operations (success = false) for this workspace and operation type
  -- This allows resetting rate limit while keeping successful operations for audit
  DELETE FROM public.domain_operations_log
  WHERE workspace_id = p_workspace_id
    AND operation_type = p_operation_type
    AND success = false;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Reset rate limit for %s operations. Removed %s failed operation(s).', p_operation_type, v_deleted_count)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_domain_operation_rate_limit(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.reset_domain_operation_rate_limit(uuid, text) IS 
'Reset rate limit for domain operations by removing failed operations from the log. Only workspace owners and admins can use this function.';
