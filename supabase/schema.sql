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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger: Auto-create profile
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();



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
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);



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

create policy "Public read invite" on invitations for select using (true);



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

