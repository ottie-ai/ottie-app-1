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
set search_path to ''
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

-- Function to delete auth.users (hard delete)
-- This requires service role key to work - call from server action with SUPABASE_SERVICE_ROLE_KEY
-- Note: This is a hard delete, not a soft delete. Use anonymize_auth_user for soft delete.
create or replace function public.delete_auth_user(user_uuid uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  -- This requires service role key to work
  -- Call from server action with SUPABASE_SERVICE_ROLE_KEY
  delete from auth.users where id = user_uuid;
end;
$$;

-- Trigger: Auto-create profile
-- Creates a new profile when a new auth.users record is created
-- Note: When user deletes account, auth.users is deleted, which cascades to profile
-- When user re-registers, a new auth.users is created with a NEW ID, so a new profile is created
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
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
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: Auto-create workspace and membership after profile creation
-- This creates a workspace for every new user (single-user plan by default)
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  workspace_name text;
  workspace_slug text;
  new_workspace_id uuid;
begin
  -- Debug: Log that trigger was called
  raise notice 'handle_new_profile: Trigger called for user_id: %, email: %, full_name: %', 
    new.id, new.email, new.full_name;

  -- Set workspace name to "Personal Workspace" for all new workspaces
  workspace_name := 'Personal Workspace';

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
$$;

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
  description text,
  
  config jsonb default '{}'::jsonb, 
  custom_domain text unique,
  thumbnail_url text,
  
  -- Stats & Meta:
  views_count int default 0,
  metadata jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default now(),
  published_at timestamp with time zone,
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



-- 8. PLANS (Subscription Plans)

create table public.plans (
  id serial primary key,
  name varchar(100) not null unique,
  description text,
  max_users int default 1,
  max_sites int default 1,
  feature_lead_generation boolean default false,
  feature_custom_domain boolean default false,
  feature_analytics boolean default false,
  feature_api_access boolean default false,
  feature_priority_support boolean default false,
  feature_3d_tours boolean default false,
  feature_pdf_flyers boolean default false,
  feature_crm_sync boolean default false,
  price_cents int default 0,
  annual_price_cents int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
   new.updated_at = now();
   return new;
end;
$$ language 'plpgsql';

create trigger update_plan_updated_at before update on plans
for each row execute function update_updated_at_column();



-- ==========================================
-- SECURITY (RLS POLICIES)
-- ==========================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.sites enable row level security;
alter table public.integrations enable row level security;
alter table public.plans enable row level security;



-- PROFILES
create policy "Users can view own profile" on profiles 
  for select using ((select auth.uid()) = id AND deleted_at IS NULL);
create policy "Users can update own profile" on profiles 
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "Users can delete own profile" on profiles 
  for delete using ((select auth.uid()) = id);
create policy "Workspace admins can view team member profiles" on profiles
  for select using (
    (select auth.uid()) = id 
    OR (
      deleted_at IS NULL 
      AND EXISTS (
        SELECT 1
        FROM memberships m1
        JOIN memberships m2 ON m1.workspace_id = m2.workspace_id
        WHERE m1.user_id = (select auth.uid())
          AND m1.role IN ('owner', 'admin')
          AND m2.user_id = profiles.id
      )
    )
  );



-- WORKSPACES (Soft Delete Filter!)
create policy "Access workspaces via membership" on workspaces
  for select using (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE workspace_id = workspaces.id
        AND user_id = (select auth.uid())
    )
  );

create policy "Owners can update workspace" on workspaces
  for update using (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE workspace_id = workspaces.id
        AND user_id = (select auth.uid())
        AND role = 'owner'
    )
  );



-- MEMBERSHIPS
-- Fix: Use a security definer function to avoid recursion
create or replace function public.user_has_workspace_access(ws_id uuid)
returns boolean
language sql
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = ws_id
    and user_id = (select auth.uid())
  );
$$;

create policy "View team members" on memberships
  for select using (
    public.user_has_workspace_access(workspace_id)
  );

create policy "Owners/admins can create memberships" on memberships
  for insert with check (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.workspace_id = m.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
    OR NOT EXISTS (
      SELECT 1 FROM memberships memberships_1
      WHERE memberships_1.user_id = (select auth.uid())
    )
  );

create policy "Owners/admins can update memberships" on memberships
  for update using (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.workspace_id = memberships.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

create policy "Owners/admins can delete memberships" on memberships
  for delete using (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.workspace_id = memberships.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
    OR user_id = (select auth.uid())
  );

-- Update last_active (Každý môže updatovať svoj timestamp)
create policy "Update own activity" on memberships
  for update using (user_id = (select auth.uid()));



-- SITES
-- Note: Sites policies are defined in sites-rls-policies.sql
-- Run that file separately after schema.sql



-- INVITATIONS
-- Policy uses plans table as single source of truth for multi-user access
create policy "Admins manage invitations" on invitations
  for all using (
    exists (
      select 1 from memberships m
      join workspaces w on w.id = m.workspace_id
      join plans p on p.name = coalesce(w.plan::text, 'free')
      where m.workspace_id = invitations.workspace_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
      and p.max_users > 1  -- Only multi-user plans can manage invitations
    )
  );

-- SECURITY FIX: Replaced "Public read invite" which exposed all invitation data
-- Old policy (INSECURE - DO NOT USE): create policy "Public read invite" on invitations for select using (true);
-- New secure policy - only allow reading invitation if:
-- 1. User's email matches the invited email, OR
-- 2. User is workspace owner/admin
create policy "Read invitation by token" on invitations 
  for select using (
    ((select auth.jwt()) ->> 'email') = email 
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.workspace_id = invitations.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

create policy "Users can accept own invitation" on invitations
  for update using (
    ((select auth.jwt()) ->> 'email') = email
    AND status = 'pending'
    AND expires_at > now()
  )
  with check (
    status = 'accepted'
    AND ((select auth.jwt()) ->> 'email') = email
  );



-- INTEGRATIONS (Len Admini)
create policy "Admins manage integrations" on integrations
  for all using (
    exists (
      select 1 from memberships m
      where m.workspace_id = integrations.workspace_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
    )
  );



-- PLANS (Public read, no user modifications)
create policy "Public read plans" on plans
  for select using (true);

create policy "No user insert" on plans
  for insert with check (false);

create policy "No user update" on plans
  for update using (false);

create policy "No user delete" on plans
  for delete using (false);



-- ==========================================
-- INITIAL DATA (Run once - Service Role bypasses RLS)
-- ==========================================

-- Insert predefined plans (idempotent - use ON CONFLICT to prevent duplicates)
INSERT INTO plans (name, description, max_users, max_sites, feature_lead_generation, feature_custom_domain, feature_analytics, feature_api_access, feature_priority_support, feature_3d_tours, feature_pdf_flyers, feature_crm_sync, price_cents, annual_price_cents) 
VALUES 
('free', 'Free to try', 1, 3, false, false, false, false, false, false, false, false, 0, 0),
('starter', 'Basic plan for individuals', 2, 10, true, false, true, false, false, false, false, false, 3900, 3300),
('growth', 'For small agencies', 5, 50, true, true, true, false, true, true, true, true, 9900, 8400),
('agency', 'For real estate companies', 20, 200, true, true, true, true, true, true, true, true, 19900, 16900),
('enterprise', 'For large networks (contact us)', 999, 9999, true, true, true, true, true, true, true, true, 39900, 33900)
ON CONFLICT (name) DO NOTHING;

