-- Create RPC function for soft delete
-- This function bypasses RLS issues by using SECURITY DEFINER
-- It still validates permissions in the function body

-- Drop existing function if exists
DROP FUNCTION IF EXISTS soft_delete_site(uuid);

-- Create the soft delete function
CREATE OR REPLACE FUNCTION soft_delete_site(site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_site RECORD;
    v_user_id uuid;
    v_membership RECORD;
    v_can_delete boolean := false;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'You must be logged in to delete a site');
    END IF;
    
    -- Get the site
    SELECT * INTO v_site FROM sites WHERE id = site_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Site not found');
    END IF;
    
    -- Check if already deleted
    IF v_site.deleted_at IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'Site is already deleted');
    END IF;
    
    -- Get user's membership in the workspace
    SELECT * INTO v_membership 
    FROM memberships 
    WHERE workspace_id = v_site.workspace_id 
    AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'You are not a member of this workspace');
    END IF;
    
    -- Check permissions
    -- Owners and admins can delete any site
    IF v_membership.role IN ('owner', 'admin') THEN
        v_can_delete := true;
    -- Agents can delete sites they created or are assigned to
    ELSIF v_membership.role = 'agent' THEN
        IF v_site.creator_id = v_user_id OR v_site.assigned_agent_id = v_user_id THEN
            v_can_delete := true;
        END IF;
    END IF;
    
    IF NOT v_can_delete THEN
        RETURN jsonb_build_object('error', 'You do not have permission to delete this site');
    END IF;
    
    -- Perform soft delete
    UPDATE sites 
    SET deleted_at = NOW()
    WHERE id = site_id 
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Failed to delete site');
    END IF;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_site(uuid) TO authenticated;

-- ==========================================
-- Notes:
-- ==========================================
-- 1. SECURITY DEFINER means the function runs with the privileges of the owner (postgres)
-- 2. This bypasses RLS policies but we validate permissions manually in the function
-- 3. The function is safe because it checks:
--    - User is authenticated
--    - User is a member of the workspace
--    - User has the correct role (owner/admin can delete all, agent only their own)
-- 4. Use this from the client like:
--    const { data, error } = await supabase.rpc('soft_delete_site', { site_id: siteId })

