-- ==========================================
-- CALCULATE SEATS USED FUNCTION
-- ==========================================
-- Function to calculate current number of active seats in a workspace
-- Used by trigger to auto-update seats_used when memberships change
-- ==========================================

-- Function to calculate seats_used for a workspace
CREATE OR REPLACE FUNCTION calculate_workspace_seats_used(ws_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM public.memberships
  WHERE workspace_id = ws_id
    AND status = 'active';
$$;

-- Trigger function to auto-update seats_used when memberships change
CREATE OR REPLACE FUNCTION update_workspace_seats_used()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_workspace_id uuid;
BEGIN
  -- Get the affected workspace_id
  affected_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  
  -- Update seats_used for the affected workspace
  UPDATE public.workspaces
  SET seats_used = calculate_workspace_seats_used(affected_workspace_id)
  WHERE id = affected_workspace_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger that runs after membership changes
DROP TRIGGER IF EXISTS trigger_update_seats_used ON public.memberships;

CREATE TRIGGER trigger_update_seats_used
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION update_workspace_seats_used();

-- Add comment
COMMENT ON FUNCTION calculate_workspace_seats_used(uuid) IS 'Calculates number of active members in a workspace';
COMMENT ON FUNCTION update_workspace_seats_used() IS 'Trigger function to auto-update seats_used when memberships change';

