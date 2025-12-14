# Supabase SQL Migrations

This directory contains SQL migration files for the Supabase database.

## Files

### Core Schema
- **`schema.sql`** - Main database schema including tables, triggers, and functions
  - Defines: profiles, workspaces, memberships, invitations, sites, integrations, plans
  - Auto-creates workspace and membership when new user signs up
  - Default workspace name: "Personal Workspace"
  - Plans table: Contains subscription plan definitions (free, starter, growth, agency, enterprise)

### RPC Functions
- **`get-user-dashboard-data-rpc.sql`** - Batched query function for app initialization
  - Returns: profile, current workspace, membership, workspace members, and all workspaces
  - Reduces database calls from multiple queries to a single RPC call
  - Usage: `SELECT * FROM get_user_dashboard_data(p_user_id := 'user-uuid', p_preferred_workspace_id := 'workspace-uuid');`

### Policies & Security
- **`workspace-members-profile-policy.sql`** - RLS policies for workspace members
- **`invitation-accept-policy.sql`** - RLS policies for workspace invitations
- **`sites-rls-policies.sql`** - RLS policies for sites (role-based access control)

### Storage
- **`create-workspace-logos-bucket.sql`** - Creates storage bucket for workspace logos
- **`create-site-thumbnails-bucket.sql`** - Creates storage bucket for site thumbnails

### Migrations
- **`add-soft-delete-migration.sql`** - Adds soft delete functionality
- **`add-performance-indexes.sql`** - Performance indexes for faster queries (IMPORTANT: Run this after schema.sql)
- **`add-sites-columns.sql`** - Adds thumbnail_url, published_at, and description columns to sites table
- **`create-plans-table.sql`** - Creates plans table for subscription plans (free, starter, growth, agency, enterprise) with RLS policies
- **`add-annual-price-to-plans.sql`** - Adds annual_price_cents column to plans table (monthly price when paid annually with 15% discount)
- **`add-password-protection-feature.sql`** - Adds feature_password_protection column to plans table
- **`add-premium-fonts-feature.sql`** - Adds feature_premium_fonts column to plans table
- **`update-invitations-rls-to-use-plans.sql`** - Updates invitations RLS policy to use plans table as single source of truth
- **`hybrid-soft-delete-setup.sql`** - **IMPORTANT**: Hybrid soft delete setup with automatic hard delete after 90 days
  - Creates partial indexes on active rows only (deleted_at IS NULL)
  - Sets up automatic cleanup cron job (hard delete after 90 days)
  - Keeps database size manageable while allowing recovery window
  - Run this after all other migrations are complete

## Setup Instructions

### 1. Initial Setup
Run these files in order in Supabase SQL Editor:

1. `schema.sql` - Creates all tables, triggers, and core functions
2. `get-user-dashboard-data-rpc.sql` - Creates RPC function for batched queries
3. `add-performance-indexes.sql` - **IMPORTANT**: Creates indexes for faster queries (run this!)
4. `workspace-members-profile-policy.sql` - Sets up RLS policies
5. `invitation-accept-policy.sql` - Sets up invitation policies
6. `sites-rls-policies.sql` - Sets up sites RLS policies (role-based access)
7. `create-workspace-logos-bucket.sql` - Creates storage bucket for workspace logos
8. `create-site-thumbnails-bucket.sql` - Creates storage bucket for site thumbnails (requires bucket creation in Dashboard first)
9. `add-sites-columns.sql` - Adds missing columns to sites table (thumbnail_url, published_at, description)
10. `create-plans-table.sql` - Creates plans table with predefined subscription plans
11. `add-annual-price-to-plans.sql` - Adds annual_price_cents column to plans table (monthly price when paid annually)
12. `hybrid-soft-delete-setup.sql` - **IMPORTANT**: Sets up hybrid soft delete with automatic cleanup (run after all other migrations)

### 2. Updating Functions
When updating functions (like `handle_new_profile` or `get_user_dashboard_data`):

1. Update the corresponding SQL file in this directory
2. Run the updated SQL in Supabase SQL Editor
3. The `create or replace function` statement will update the existing function

### 3. Important Notes

- **Default Workspace Name**: All new workspaces are created with the name "Personal Workspace"
- **RPC Function**: `get_user_dashboard_data` must be kept in sync with the codebase
- **Triggers**: The `handle_new_profile` trigger automatically creates a workspace when a new user signs up

## RPC Function: get_user_dashboard_data

### Purpose
Batches multiple database queries into a single call for faster app initialization.

### Parameters
- `p_user_id` (uuid, required) - The user ID to fetch data for
- `p_preferred_workspace_id` (uuid, optional) - Preferred workspace ID (from localStorage)

### Returns
JSONB object with:
- `profile` - User profile data
- `workspace` - Current workspace (preferred or most recent)
- `membership` - Current workspace membership
- `members` - Array of workspace members with profiles
- `allWorkspaces` - Array of all workspaces user is a member of (with role)
- `plans` - Array of all subscription plans (single source of truth for plan features)

### Example Usage
```sql
SELECT * FROM get_user_dashboard_data(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_preferred_workspace_id := '987fcdeb-51a2-43d7-b890-123456789abc'
);
```

### Client Usage
```typescript
const { data, error } = await supabase.rpc('get_user_dashboard_data', {
  p_user_id: userId,
  p_preferred_workspace_id: preferredWorkspaceId || null,
})
```

## Maintenance

When making changes to:
- **Workspace creation logic**: Update `schema.sql` → `handle_new_profile()` function
- **App data loading**: Update `get-user-dashboard-data-rpc.sql`
- **RLS policies**: Update corresponding policy files

Always test changes in a development environment before applying to production.

## Soft Delete Strategy

The app uses a **hybrid soft delete approach**:

1. **Soft delete as default**: All deletions set `deleted_at` timestamp (no hard delete)
2. **RLS policies filter**: All SELECT queries automatically filter `deleted_at IS NULL`
3. **Partial indexes**: Indexes only include active rows (`WHERE deleted_at IS NULL`)
4. **Automatic cleanup**: Cron job hard deletes rows soft-deleted more than 90 days ago

### Benefits
- **Recovery window**: 90 days to recover accidentally deleted data
- **Database size**: Automatic cleanup prevents database bloat
- **Performance**: Partial indexes keep queries fast (only index active rows)
- **Support**: 90-day window for debugging and support requests

### Manual Cleanup
If you need to manually run cleanup:
```sql
SELECT * FROM public.hard_delete_old_soft_deleted_rows(90);
```

### Adjusting Retention Period
To change from 90 to 30 days:
```sql
SELECT cron.unschedule('hard-delete-old-soft-deleted-rows');
SELECT cron.schedule(
  'hard-delete-old-soft-deleted-rows',
  '0 2 * * *',
  $$ SELECT public.hard_delete_old_soft_deleted_rows(30); $$
);
```

