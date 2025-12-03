-- ==========================================
-- RPC Function: get_user_dashboard_data
-- ==========================================
-- Batches multiple queries into a single database call
-- Returns: profile, workspace, membership, workspace members, and all workspaces
-- 
-- This replaces separate calls to:
-- - getProfile(userId)
-- - getWorkspace(workspaceId) / getCurrentUserWorkspace(userId)
-- - getMembers(workspaceId) / getWorkspaceMembers(workspaceId)
-- - getAllUserWorkspaces(userId)
-- 
-- Parameters:
--   p_user_id (uuid, required) - The user ID to fetch data for
--   p_preferred_workspace_id (uuid, optional) - Preferred workspace ID (from localStorage)
-- 
-- Returns (JSONB):
--   {
--     "profile": { ... } | null,
--     "workspace": { ... } | null,
--     "membership": { ... } | null,
--     "members": [{ membership: {...}, profile: {...} }, ...],
--     "allWorkspaces": [{ workspace: {...}, role: "owner|admin|agent" }, ...]
--   }
-- 
-- Usage:
--   SELECT * FROM get_user_dashboard_data(
--     p_user_id := 'user-uuid',
--     p_preferred_workspace_id := 'workspace-uuid'  -- optional
--   );
-- 
-- Client Usage (TypeScript):
--   const { data, error } = await supabase.rpc('get_user_dashboard_data', {
--     p_user_id: userId,
--     p_preferred_workspace_id: preferredWorkspaceId || null,
--   })
-- 
-- Notes:
--   - If p_preferred_workspace_id is provided, it tries to load that workspace first
--   - If preferred workspace not found or not provided, returns most recent workspace
--   - allWorkspaces includes all workspaces where user is a member (ordered by created_at desc)
--   - All workspaces are filtered to exclude deleted workspaces (deleted_at IS NULL)
-- ==========================================

create or replace function public.get_user_dashboard_data(
  p_user_id uuid,
  p_preferred_workspace_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_profile jsonb;
  v_workspace jsonb;
  v_membership jsonb;
  v_members jsonb;
  v_all_workspaces jsonb;
  v_workspace_id uuid;
  v_result jsonb;
begin
  -- Get user profile
  select to_jsonb(p.*) into v_profile
  from public.profiles p
  where p.id = p_user_id
    and p.deleted_at is null;

  -- Get user's workspace and membership (preferred if provided, otherwise most recent)
  if p_preferred_workspace_id is not null then
    -- Try to get preferred workspace first
    select 
      to_jsonb(w.*),
      to_jsonb(m.*),
      w.id
    into v_workspace, v_membership, v_workspace_id
    from public.memberships m
    inner join public.workspaces w on w.id = m.workspace_id
    where m.user_id = p_user_id
      and m.workspace_id = p_preferred_workspace_id
      and w.deleted_at is null
    limit 1;
  end if;

  -- If preferred workspace not found, get most recent
  if v_workspace is null then
    select 
      to_jsonb(w.*),
      to_jsonb(m.*),
      w.id
    into v_workspace, v_membership, v_workspace_id
    from public.memberships m
    inner join public.workspaces w on w.id = m.workspace_id
    where m.user_id = p_user_id
      and w.deleted_at is null
    order by m.created_at desc
    limit 1;
  end if;

  -- Get workspace members (only if workspace exists)
  if v_workspace_id is not null then
    with ordered_members as (
      select 
        mem.id as mem_id,
        mem.workspace_id,
        mem.user_id,
        mem.role,
        mem.last_active_at,
        mem.created_at as mem_created_at,
        to_jsonb(p.*) as profile_json
      from public.memberships mem
      inner join public.profiles p on p.id = mem.user_id
      where mem.workspace_id = v_workspace_id
        and p.deleted_at is null
      order by mem.created_at desc
    )
    select jsonb_agg(
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
    ) into v_members
    from ordered_members;
  else
    v_members := '[]'::jsonb;
  end if;

  -- Get all user workspaces (eliminates separate query in client)
  select jsonb_agg(
    jsonb_build_object(
      'workspace', to_jsonb(w.*),
      'role', m.role
    )
    order by m.created_at desc
  ) into v_all_workspaces
  from public.memberships m
  inner join public.workspaces w on w.id = m.workspace_id
  where m.user_id = p_user_id
    and w.deleted_at is null;

  -- Build result object
  v_result := jsonb_build_object(
    'profile', coalesce(v_profile, 'null'::jsonb),
    'workspace', coalesce(v_workspace, 'null'::jsonb),
    'membership', coalesce(v_membership, 'null'::jsonb),
    'members', coalesce(v_members, '[]'::jsonb),
    'allWorkspaces', coalesce(v_all_workspaces, '[]'::jsonb)
  );

  return v_result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_user_dashboard_data(uuid, uuid) to authenticated;

