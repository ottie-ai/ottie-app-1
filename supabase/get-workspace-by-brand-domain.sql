-- RPC function to get workspace by brand domain
-- This is more secure and performant than fetching all workspaces
-- Only returns workspace if domain is verified

CREATE OR REPLACE FUNCTION get_workspace_by_brand_domain(domain_name TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  plan TEXT,
  branding_config JSONB,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.slug,
    w.plan,
    w.branding_config,
    w.created_at,
    w.deleted_at
  FROM workspaces w
  WHERE 
    w.deleted_at IS NULL
    AND (w.branding_config->>'custom_brand_domain') = domain_name
    AND (w.branding_config->>'custom_brand_domain_verified') = 'true';
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_by_brand_domain(TEXT) TO anon;

COMMENT ON FUNCTION get_workspace_by_brand_domain(TEXT) IS 'Get workspace by verified brand domain. Returns workspace only if domain is verified.';
