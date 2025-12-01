-- ==========================================
-- RPC Function: get_user_dashboard_data
-- ==========================================
-- Batches multiple queries into a single database call
-- Returns: profile, workspace, membership, and workspace members
-- 
-- This replaces separate calls to:
-- - getProfile(userId)
-- - getWorkspace(workspaceId) / getCurrentUserWorkspace(userId)
-- - getMembers(workspaceId) / getWorkspaceMembers(workspaceId)
-- 
-- Usage:
-- SELECT * FROM get_user_dashboard_data(p_user_id := 'user-uuid');
-- ==========================================

create or replace function public.get_user_dashboard_data(
  p_user_id uuid,
  p_preferred_workspace_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_profile jsonb;
  v_workspace jsonb;
  v_membership jsonb;
  v_members jsonb;
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

  -- Build result object
  v_result := jsonb_build_object(
    'profile', coalesce(v_profile, 'null'::jsonb),
    'workspace', coalesce(v_workspace, 'null'::jsonb),
    'membership', coalesce(v_membership, 'null'::jsonb),
    'members', coalesce(v_members, '[]'::jsonb)
  );

  return v_result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_user_dashboard_data(uuid, uuid) to authenticated;

