-- ==========================================
-- Performance Indexes for Faster Queries
-- ==========================================
-- These indexes optimize the queries used in get_user_dashboard_data RPC
-- and other workspace-related queries
-- 
-- Run this in Supabase SQL Editor after running schema.sql
-- ==========================================

-- Index for memberships.user_id (used in get_user_dashboard_data to find all user workspaces)
-- This significantly speeds up queries like: WHERE user_id = ? AND workspace.deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_memberships_user_id 
ON public.memberships(user_id);

-- Index for memberships.workspace_id (used in workspace member queries)
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id 
ON public.memberships(workspace_id);

-- Composite index for common query pattern: user_id + created_at (for ordering)
-- Used in: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_memberships_user_id_created_at 
ON public.memberships(user_id, created_at DESC);

-- Index for workspaces.deleted_at (used in WHERE deleted_at IS NULL filters)
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at 
ON public.workspaces(deleted_at) 
WHERE deleted_at IS NULL;

-- Index for profiles.deleted_at (used in WHERE deleted_at IS NULL filters)
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at 
ON public.profiles(deleted_at) 
WHERE deleted_at IS NULL;

-- Composite index for memberships join with workspaces
-- Optimizes: JOIN workspaces ON workspaces.id = memberships.workspace_id WHERE deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id_user_id 
ON public.memberships(workspace_id, user_id);

-- Index for memberships.created_at (used for ordering in get_user_dashboard_data)
CREATE INDEX IF NOT EXISTS idx_memberships_created_at 
ON public.memberships(created_at DESC);

