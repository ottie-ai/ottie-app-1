-- RPC function to get workspace by brand domain
-- This is more secure and performant than fetching all workspaces
-- Only returns workspace if domain is verified
-- Returns all workspace columns to match Workspace type

-- Drop existing function if it exists (in case return type changed)
DROP FUNCTION IF EXISTS get_workspace_by_brand_domain(TEXT);

CREATE OR REPLACE FUNCTION get_workspace_by_brand_domain(domain_name TEXT)
RETURNS SETOF workspaces
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT w.*
  FROM workspaces w
  WHERE 
    w.deleted_at IS NULL
    AND (w.branding_config->>'custom_brand_domain') = domain_name
    AND (w.branding_config->>'custom_brand_domain_verified') = 'true'
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO anon;

COMMENT ON FUNCTION get_workspace_by_brand_domain(TEXT) IS 'Get workspace by verified brand domain. Returns workspace only if domain is verified.';
