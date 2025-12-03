-- ==========================================
-- Fix Function Search Path Warnings
-- ==========================================
-- This migration fixes security warnings for functions with mutable search_path
-- All security definer functions must have SET search_path to prevent injection attacks
-- ==========================================

-- 1. Fix anonymize_auth_user function
CREATE OR REPLACE FUNCTION public.anonymize_auth_user(user_uuid uuid, anonymized_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Anonymize email in auth.users so user can re-register with original email
  -- Profile remains anonymized (soft delete) for compliance/analytics
  UPDATE auth.users 
  SET email = anonymized_email,
      raw_user_meta_data = jsonb_build_object('deleted', true),
      updated_at = now()
  WHERE id = user_uuid;
END;
$$;

-- 2. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Always create a new profile for new auth.users
  -- Since auth.users was deleted (cascade deleted profile), this is always a new user
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      NULL
    )
  );
  RETURN new;
END;
$$;

-- 3. Fix handle_new_profile function
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  workspace_name text;
  workspace_slug text;
  new_workspace_id uuid;
BEGIN
  -- Debug: Log that trigger was called
  RAISE NOTICE 'handle_new_profile: Trigger called for user_id: %, email: %, full_name: %', 
    new.id, new.email, new.full_name;

  -- Set workspace name to "Personal Workspace" for all new workspaces
  workspace_name := 'Personal Workspace';

  -- Debug: Log workspace name
  RAISE NOTICE 'handle_new_profile: Generated workspace_name: %', workspace_name;

  -- Generate unique slug from workspace name
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  workspace_slug := lower(regexp_replace(
    regexp_replace(workspace_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  -- Ensure slug is unique by appending user ID if needed
  -- We'll use a simple approach: slug + first 8 chars of user ID
  workspace_slug := workspace_slug || '-' || substr(new.id::text, 1, 8);

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

-- 4. Fix user_has_workspace_access function
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = ws_id
    AND user_id = auth.uid()
  );
$$;

-- 5. Fix get_user_dashboard_data function
CREATE OR REPLACE FUNCTION public.get_user_dashboard_data(
  p_user_id uuid,
  p_preferred_workspace_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile jsonb;
  v_workspace jsonb;
  v_membership jsonb;
  v_members jsonb;
  v_all_workspaces jsonb;
  v_workspace_id uuid;
  v_result jsonb;
BEGIN
  -- Get user profile
  SELECT to_jsonb(p.*) INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id
    AND p.deleted_at IS NULL;

  -- Get user's workspace and membership (preferred if provided, otherwise most recent)
  IF p_preferred_workspace_id IS NOT NULL THEN
    -- Try to get preferred workspace first
    SELECT 
      to_jsonb(w.*),
      to_jsonb(m.*),
      w.id
    INTO v_workspace, v_membership, v_workspace_id
    FROM public.memberships m
    INNER JOIN public.workspaces w ON w.id = m.workspace_id
    WHERE m.user_id = p_user_id
      AND m.workspace_id = p_preferred_workspace_id
      AND w.deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- If preferred workspace not found, get most recent
  IF v_workspace IS NULL THEN
    SELECT 
      to_jsonb(w.*),
      to_jsonb(m.*),
      w.id
    INTO v_workspace, v_membership, v_workspace_id
    FROM public.memberships m
    INNER JOIN public.workspaces w ON w.id = m.workspace_id
    WHERE m.user_id = p_user_id
      AND w.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1;
  END IF;

  -- Get workspace members (only if workspace exists)
  IF v_workspace_id IS NOT NULL THEN
    WITH ordered_members AS (
      SELECT 
        mem.id AS mem_id,
        mem.workspace_id,
        mem.user_id,
        mem.role,
        mem.last_active_at,
        mem.created_at AS mem_created_at,
        to_jsonb(p.*) AS profile_json
      FROM public.memberships mem
      INNER JOIN public.profiles p ON p.id = mem.user_id
      WHERE mem.workspace_id = v_workspace_id
        AND p.deleted_at IS NULL
      ORDER BY mem.created_at DESC
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'membership', jsonb_build_object(
          'id', mem_id,
          'workspace_id', workspace_id,
          'user_id', user_id,
          'role', role,
          'last_active_at', last_active_at,
          'created_at', mem_created_at
        ),
        'profile', profile_json
      )
    ) INTO v_members
    FROM ordered_members;
  ELSE
    v_members := '[]'::jsonb;
  END IF;

  -- Get all user workspaces (eliminates separate query in client)
  SELECT jsonb_agg(
    jsonb_build_object(
      'workspace', to_jsonb(w.*),
      'role', m.role
    )
    ORDER BY m.created_at DESC
  ) INTO v_all_workspaces
  FROM public.memberships m
  INNER JOIN public.workspaces w ON w.id = m.workspace_id
  WHERE m.user_id = p_user_id
    AND w.deleted_at IS NULL;

  -- Build result object
  v_result := jsonb_build_object(
    'profile', COALESCE(v_profile, 'null'::jsonb),
    'workspace', COALESCE(v_workspace, 'null'::jsonb),
    'membership', COALESCE(v_membership, 'null'::jsonb),
    'members', COALESCE(v_members, '[]'::jsonb),
    'allWorkspaces', COALESCE(v_all_workspaces, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- 6. Fix delete_auth_user function
-- This function deletes a user from auth.users
-- Requires service role key to work - call from server action with SUPABASE_SERVICE_ROLE_KEY
CREATE OR REPLACE FUNCTION public.delete_auth_user(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- This requires service role key to work
  -- Call from server action with SUPABASE_SERVICE_ROLE_KEY
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

-- ==========================================
-- Notes:
-- ==========================================
-- 1. SET search_path = '' prevents search_path injection attacks
-- 2. All functions must use fully qualified names (schema.table) when search_path is empty
-- 3. auth.uid() and other auth functions work without schema prefix
-- 4. This migration fixes all security definer functions to be secure
-- 5. The delete_auth_user function is directly fixed with SET search_path = ''
--
-- ==========================================
-- IMPORTANT: Leaked Password Protection
-- ==========================================
-- The "Leaked Password Protection Disabled" warning cannot be fixed via SQL.
-- You must enable it manually in Supabase Dashboard:
--
-- Steps:
-- 1. Go to Supabase Dashboard → Authentication → Policies
-- 2. Find "Password" section
-- 3. Enable "Leaked Password Protection" (or "Breached Password Detection")
-- 4. This will check passwords against known data breach databases
--
-- Alternatively, you can enable it via Supabase CLI or API:
-- https://supabase.com/docs/guides/auth/password-security
-- ==========================================
--

