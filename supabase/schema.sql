-- ==========================================
-- SUPABASE DATABASE SCHEMA
-- ==========================================
-- Run this SQL in your Supabase SQL Editor
-- to create all tables, enums, and RLS policies
-- ==========================================

-- 1. ENUMS

create type user_role as enum ('owner', 'admin', 'agent');

create type sub_plan as enum ('free', 'starter', 'growth', 'agency', 'enterprise');

create type site_status as enum ('draft', 'published', 'archived');

create type invite_status as enum ('pending', 'accepted', 'expired');



-- 2. PROFILES

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  preferences jsonb default '{}'::jsonb, -- UI preferences (theme, lang)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone -- Soft Delete: when account was deleted
);

-- Function to anonymize auth.users email (for soft delete to allow re-registration)
-- This allows user to re-register with the same email while preserving anonymized data
create or replace function public.anonymize_auth_user(user_uuid uuid, anonymized_email text)
returns void
language plpgsql
security definer
as $$
begin
  -- Anonymize email in auth.users so user can re-register with original email
  -- Profile remains anonymized (soft delete) for compliance/analytics
  update auth.users 
  set email = anonymized_email,
      raw_user_meta_data = jsonb_build_object('deleted', true),
      updated_at = now()
  where id = user_uuid;
end;
$$;

-- Trigger: Auto-create profile
-- Creates a new profile when a new auth.users record is created
-- Note: When user deletes account, auth.users is deleted, which cascades to profile
-- When user re-registers, a new auth.users is created with a NEW ID, so a new profile is created
create function public.handle_new_user()
returns trigger as $$
begin
  -- Always create a new profile for new auth.users
  -- Since auth.users was deleted (cascade deleted profile), this is always a new user
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      NULL
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: Auto-create workspace and membership after profile creation
-- This creates a workspace for every new user (single-user plan by default)
create or replace function public.handle_new_profile()
returns trigger as $$
declare
  workspace_name text;
  workspace_slug text;
  new_workspace_id uuid;
begin
  -- Debug: Log that trigger was called
  raise notice 'handle_new_profile: Trigger called for user_id: %, email: %, full_name: %', 
    new.id, new.email, new.full_name;

  -- Generate workspace name from user's full_name or email
  -- Format: "{full_name}'s Workspace" or "{email}'s Workspace"
  if new.full_name is not null and trim(new.full_name) != '' then
    workspace_name := new.full_name || '''s Workspace';
  else
    -- Use email username (part before @) or full email
    workspace_name := COALESCE(
      split_part(new.email, '@', 1),
      'User'
    ) || '''s Workspace';
  end if;

  -- Debug: Log workspace name
  raise notice 'handle_new_profile: Generated workspace_name: %', workspace_name;

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
  raise notice 'handle_new_profile: Generated workspace_slug: %', workspace_slug;

  -- Create workspace with 'free' plan (single-user plan by default)
  begin
    insert into public.workspaces (name, slug, plan)
    values (workspace_name, workspace_slug, 'free')
    returning id into new_workspace_id;
    
    raise notice 'handle_new_profile: Workspace created successfully with id: %', new_workspace_id;
  exception when others then
    raise exception 'handle_new_profile: Failed to create workspace. Error: %, Detail: %', 
      SQLERRM, SQLSTATE;
  end;

  -- Create membership with 'owner' role
  begin
    insert into public.memberships (workspace_id, user_id, role)
    values (new_workspace_id, new.id, 'owner');
    
    raise notice 'handle_new_profile: Membership created successfully for user_id: %, workspace_id: %', 
      new.id, new_workspace_id;
  exception when others then
    raise exception 'handle_new_profile: Failed to create membership. Error: %, Detail: %', 
      SQLERRM, SQLSTATE;
  end;

  raise notice 'handle_new_profile: Successfully completed for user_id: %', new.id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();



-- 3. WORKSPACES (Firma)

create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  logo_url text,
  plan sub_plan default 'free',
  stripe_customer_id text,
  
  -- Future Proofing:
  branding_config jsonb default '{}'::jsonb,
  usage_stats jsonb default '{"sites_created": 0, "ai_credits_used": 0, "storage_mb": 0}'::jsonb,
  metadata jsonb default '{}'::jsonb, -- Extra data
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone -- Soft Delete!
);



-- 4. MEMBERSHIPS (Vzťah User <-> Workspace)

create table public.memberships (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role user_role default 'agent',
  
  -- Activity Tracking:
  last_active_at timestamp with time zone default now(), -- Kedy tu naposledy niečo robil
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, user_id)
);



-- 5. INVITATIONS

create table public.invitations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  email text not null,
  role user_role default 'agent',
  token text unique not null,
  status invite_status default 'pending',
  invited_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (now() + interval '7 days')
);



-- 6. SITES (Weby)

create table public.sites (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  creator_id uuid references public.profiles(id), 
  assigned_agent_id uuid references public.profiles(id),
  title text not null,
  slug text not null,
  status site_status default 'draft',
  
  config jsonb default '{}'::jsonb, 
  custom_domain text unique,
  
  -- Stats & Meta:
  views_count int default 0,
  metadata jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone, -- Soft Delete!
  
  unique(workspace_id, slug)
);



-- 7. INTEGRATIONS (Pre CRM, Zapier)

create table public.integrations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  provider text not null, -- 'hubspot', 'pipedrive', 'zapier_webhook'
  config jsonb default '{}'::jsonb, -- API Keys (Encrypted ideally)
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);



-- ==========================================
-- SECURITY (RLS POLICIES)
-- ==========================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.sites enable row level security;
alter table public.integrations enable row level security;



-- PROFILES
create policy "Users can view own profile" on profiles 
  for select using (auth.uid() = id AND deleted_at IS NULL);
create policy "Users can update own profile" on profiles 
  for update using (auth.uid() = id AND deleted_at IS NULL);
create policy "Users can soft delete own profile" on profiles 
  for update using (auth.uid() = id);



-- WORKSPACES (Soft Delete Filter!)
create policy "Access workspaces via membership" on workspaces
  for select using (
    deleted_at is null AND -- Nevracať zmazané
    exists (
      select 1 from memberships
      where workspace_id = workspaces.id
      and user_id = auth.uid()
    )
  );

-- Allow security definer functions to create workspaces (for triggers)
-- The trigger function runs with security definer, so it has elevated privileges
-- This policy allows the trigger to create workspaces during user registration
create policy "System can create workspaces" on workspaces
  for insert with check (true);

-- Allow security definer functions to update workspaces (for system operations)
create policy "System can update workspaces" on workspaces
  for update using (true) with check (true);

-- Allow security definer functions to delete workspaces (for system operations)
create policy "System can delete workspaces" on workspaces
  for delete using (true);

create policy "Owners can update workspace" on workspaces
  for update using (
    exists (
      select 1 from memberships
      where workspace_id = workspaces.id
      and user_id = auth.uid()
      and role = 'owner'
    )
  );



-- MEMBERSHIPS
-- Fix: Use a security definer function to avoid recursion
create or replace function public.user_has_workspace_access(ws_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = ws_id
    and user_id = auth.uid()
  );
$$ language sql security definer;

create policy "View team members" on memberships
  for select using (
    public.user_has_workspace_access(workspace_id)
  );

-- Allow security definer functions to create memberships (for triggers)
-- The trigger function runs with security definer, so it has elevated privileges
-- This policy allows the trigger to create memberships during user registration
create policy "System can create memberships" on memberships
  for insert with check (true);

-- Allow security definer functions to update memberships (for system operations)
create policy "System can update memberships" on memberships
  for update using (true) with check (true);

-- Allow security definer functions to delete memberships (for system operations)
create policy "System can delete memberships" on memberships
  for delete using (true);

-- Update last_active (Každý môže updatovať svoj timestamp)
create policy "Update own activity" on memberships
  for update using (user_id = auth.uid());



-- SITES (Soft Delete Filter!)
create policy "Access sites based on role" on sites
  for all using (
    deleted_at is null AND -- Nevracať zmazané (pokiaľ to nie je Trash Bin view)
    exists (
      select 1 from memberships m
      where m.workspace_id = sites.workspace_id
      and m.user_id = auth.uid()
      and (
         m.role in ('owner', 'admin')
         or
         (sites.assigned_agent_id = auth.uid() or sites.creator_id = auth.uid())
      )
    )
  );



-- INVITATIONS
create policy "Admins manage invitations" on invitations
  for all using (
    exists (
      select 1 from memberships m
      join workspaces w on w.id = m.workspace_id
      where m.workspace_id = invitations.workspace_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
      and w.plan in ('agency', 'enterprise')
    )
  );

-- SECURITY FIX: Replaced "Public read invite" which exposed all invitation data
-- Old policy (INSECURE - DO NOT USE): create policy "Public read invite" on invitations for select using (true);
-- New secure policy - only allow reading invitation if:
-- 1. User's email matches the invited email, OR
-- 2. User is workspace owner/admin
create policy "Read invitation by token" on invitations 
  for select using (
    auth.jwt() ->> 'email' = email 
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.workspace_id = invitations.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

-- Migration: If you already have the old policy, run:
-- DROP POLICY IF EXISTS "Public read invite" ON invitations;



-- INTEGRATIONS (Len Admini)
create policy "Admins manage integrations" on integrations
  for all using (
    exists (
      select 1 from memberships m
      where m.workspace_id = integrations.workspace_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
    )
  );

