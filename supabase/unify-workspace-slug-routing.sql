-- ==========================================
-- Unify Workspace Slug Routing
-- ==========================================
-- This migration changes the URL structure from:
--   site-slug.ottie.site → workspace-slug.ottie.site/site-slug
-- 
-- Changes:
-- 1. Change unique constraint from (slug, domain) to (workspace_id, slug)
-- 2. Remove domain column from sites (no longer needed for ottie.site routing)
-- 3. Rename branding_config keys: brand → workspace
-- 4. Rename plan feature: feature_custom_brand_domain → feature_custom_workspace_domain
-- 5. Update handle_new_profile trigger for better workspace slug generation
-- ==========================================

-- ==========================================
-- STEP 1: Update Sites Table - Change Unique Constraint
-- ==========================================

-- Drop the old domain-based unique index
DROP INDEX IF EXISTS sites_slug_domain_unique_active;

-- Create new workspace-based unique index
-- Site slug must be unique within a workspace (not globally)
CREATE UNIQUE INDEX IF NOT EXISTS sites_slug_workspace_unique_active
ON public.sites (workspace_id, slug)
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON INDEX sites_slug_workspace_unique_active IS 
  'Ensures site slug is unique within a workspace. Soft-deleted sites release their slug for reuse.';

-- ==========================================
-- STEP 2: Update Workspaces - Rename branding_config keys
-- ==========================================

-- Rename custom_brand_domain to custom_workspace_domain in branding_config
UPDATE public.workspaces
SET branding_config = branding_config 
  - 'custom_brand_domain' 
  - 'custom_brand_domain_verified'
  - 'custom_brand_domain_verified_at'
  - 'custom_brand_domain_verification_history'
  || jsonb_build_object(
    'custom_workspace_domain', branding_config->>'custom_brand_domain',
    'custom_workspace_domain_verified', (branding_config->>'custom_brand_domain_verified')::boolean,
    'custom_workspace_domain_verified_at', branding_config->>'custom_brand_domain_verified_at',
    'custom_workspace_domain_verification_history', branding_config->'custom_brand_domain_verification_history'
  )
WHERE branding_config->>'custom_brand_domain' IS NOT NULL;

-- Clean up null values from the jsonb (remove keys with null values)
UPDATE public.workspaces
SET branding_config = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(branding_config)
  WHERE value IS NOT NULL AND value::text != 'null'
)
WHERE branding_config IS NOT NULL AND branding_config != '{}'::jsonb;

-- ==========================================
-- STEP 3: Update Plans Table - Rename feature
-- ==========================================

-- Rename feature_custom_brand_domain to feature_custom_workspace_domain
ALTER TABLE public.plans 
RENAME COLUMN feature_custom_brand_domain TO feature_custom_workspace_domain;

-- ==========================================
-- STEP 4: Update handle_new_profile Trigger
-- ==========================================
-- Generate workspace slug from name without suffix, add suffix only if conflict

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  workspace_name text;
  workspace_slug text;
  base_slug text;
  slug_counter int;
  new_workspace_id uuid;
BEGIN
  -- Debug: Log that trigger was called
  RAISE NOTICE 'handle_new_profile: Trigger called for user_id: %, email: %, full_name: %', 
    new.id, new.email, new.full_name;

  -- Set workspace name to "Personal Workspace" for all new workspaces
  workspace_name := 'Personal Workspace';

  -- Debug: Log workspace name
  RAISE NOTICE 'handle_new_profile: Generated workspace_name: %', workspace_name;

  -- Generate base slug from workspace name
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(
    regexp_replace(workspace_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  -- Try the base slug first
  workspace_slug := base_slug;
  slug_counter := 1;
  
  -- Check if slug exists and add suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = workspace_slug AND deleted_at IS NULL) LOOP
    slug_counter := slug_counter + 1;
    workspace_slug := base_slug || '-' || slug_counter::text;
    
    -- Safety limit to prevent infinite loop
    IF slug_counter > 10000 THEN
      -- Fallback: append user ID
      workspace_slug := base_slug || '-' || substr(new.id::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;

  -- Debug: Log workspace slug
  RAISE NOTICE 'handle_new_profile: Generated workspace_slug: %', workspace_slug;

  -- Create workspace with 'free' plan (single-user plan by default)
  BEGIN
    INSERT INTO public.workspaces (name, slug, plan)
    VALUES (workspace_name, workspace_slug, 'free')
    RETURNING id INTO new_workspace_id;
    
    RAISE NOTICE 'handle_new_profile: Workspace created successfully with id: %', new_workspace_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'handle_new_profile: Failed to create workspace. Error: %, Detail: %', 
      SQLERRM, SQLSTATE;
  END;

  -- Create membership with 'owner' role
  BEGIN
    INSERT INTO public.memberships (workspace_id, user_id, role)
    VALUES (new_workspace_id, new.id, 'owner');
    
    RAISE NOTICE 'handle_new_profile: Membership created successfully for user_id: %, workspace_id: %', 
      new.id, new_workspace_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'handle_new_profile: Failed to create membership. Error: %, Detail: %', 
      SQLERRM, SQLSTATE;
  END;

  RAISE NOTICE 'handle_new_profile: Successfully completed for user_id: %', new.id;
  RETURN new;
END;
$$;

-- ==========================================
-- STEP 5: Create RPC function to get workspace by slug
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_workspace_by_slug(workspace_slug text)
RETURNS SETOF public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.workspaces
  WHERE slug = lower(workspace_slug)
    AND deleted_at IS NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_workspace_by_slug(text) TO anon, authenticated;

-- ==========================================
-- STEP 6: Update get_workspace_by_brand_domain RPC
-- ==========================================
-- Rename to get_workspace_by_workspace_domain for consistency

CREATE OR REPLACE FUNCTION public.get_workspace_by_workspace_domain(domain_name text)
RETURNS SETOF public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized_domain text;
BEGIN
  -- Normalize domain: remove www prefix, lowercase
  normalized_domain := lower(domain_name);
  IF normalized_domain LIKE 'www.%' THEN
    normalized_domain := substring(normalized_domain FROM 5);
  END IF;
  
  RETURN QUERY
  SELECT *
  FROM public.workspaces
  WHERE (branding_config->>'custom_workspace_domain' = normalized_domain
         OR branding_config->>'custom_workspace_domain' = 'www.' || normalized_domain)
    AND (branding_config->>'custom_workspace_domain_verified')::boolean = true
    AND deleted_at IS NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_workspace_by_workspace_domain(text) TO anon, authenticated;

-- Keep the old function name as alias for backward compatibility during migration
CREATE OR REPLACE FUNCTION public.get_workspace_by_brand_domain(domain_name text)
RETURNS SETOF public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_workspace_by_workspace_domain(domain_name);
END;
$$;

-- ==========================================
-- STEP 7: Create function to check workspace slug availability
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_workspace_slug_availability(slug_to_check text, exclude_workspace_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  slug_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE slug = lower(slug_to_check) 
      AND deleted_at IS NULL
      AND (exclude_workspace_id IS NULL OR id != exclude_workspace_id)
  ) INTO slug_exists;
  
  -- Return true if slug is available (does NOT exist)
  RETURN NOT slug_exists;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_workspace_slug_availability(text, uuid) TO authenticated;

-- ==========================================
-- STEP 8: Create function to update workspace slug
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_workspace_slug(
  workspace_id_param uuid,
  new_slug text,
  user_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized_slug text;
  is_owner boolean;
  result jsonb;
BEGIN
  -- Normalize slug
  normalized_slug := lower(trim(new_slug));
  
  -- Validate slug format (5-63 chars, alphanumeric and hyphens, no leading/trailing hyphens)
  IF length(normalized_slug) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug must be at least 5 characters');
  END IF;
  
  IF length(normalized_slug) > 63 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug must be at most 63 characters');
  END IF;
  
  IF normalized_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(normalized_slug) > 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug can only contain lowercase letters, numbers, and hyphens');
  END IF;
  
  IF normalized_slug ~ '^-' OR normalized_slug ~ '-$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug cannot start or end with a hyphen');
  END IF;
  
  -- Check if user is owner
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE workspace_id = workspace_id_param 
      AND user_id = user_id_param 
      AND role = 'owner'
  ) INTO is_owner;
  
  IF NOT is_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only workspace owner can change the slug');
  END IF;
  
  -- Check if slug is available
  IF NOT public.check_workspace_slug_availability(normalized_slug, workspace_id_param) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This slug is already taken');
  END IF;
  
  -- Update the slug
  UPDATE public.workspaces
  SET slug = normalized_slug
  WHERE id = workspace_id_param;
  
  RETURN jsonb_build_object('success', true, 'slug', normalized_slug);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_workspace_slug(uuid, text, uuid) TO authenticated;

-- ==========================================
-- Notes:
-- ==========================================
-- 1. Site slugs are now unique per workspace, not per domain
-- 2. URL structure: workspace-slug.ottie.site/site-slug
-- 3. Custom workspace domains still work: custom-domain.com/site-slug
-- 4. Workspace slugs must be globally unique (for subdomain routing)
-- 5. The domain column in sites table is kept for backward compatibility
--    but is no longer used for uniqueness constraint
-- ==========================================

