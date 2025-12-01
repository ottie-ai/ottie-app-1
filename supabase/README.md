# Supabase SQL Migrations

This directory contains SQL migration files for the Supabase database.

## Files

### Core Schema
- **`schema.sql`** - Main database schema including tables, triggers, and functions
  - Defines: profiles, workspaces, memberships, invitations, sites, pages, sections
  - Auto-creates workspace and membership when new user signs up
  - Default workspace name: "Personal Workspace"

### RPC Functions
- **`get-user-dashboard-data-rpc.sql`** - Batched query function for app initialization
  - Returns: profile, current workspace, membership, workspace members, and all workspaces
  - Reduces database calls from multiple queries to a single RPC call
  - Usage: `SELECT * FROM get_user_dashboard_data(p_user_id := 'user-uuid', p_preferred_workspace_id := 'workspace-uuid');`

### Policies & Security
- **`workspace-members-profile-policy.sql`** - RLS policies for workspace members
- **`invitation-accept-policy.sql`** - RLS policies for workspace invitations

### Storage
- **`create-workspace-logos-bucket.sql`** - Creates storage bucket for workspace logos

### Migrations
- **`add-soft-delete-migration.sql`** - Adds soft delete functionality

## Setup Instructions

### 1. Initial Setup
Run these files in order in Supabase SQL Editor:

1. `schema.sql` - Creates all tables, triggers, and core functions
2. `get-user-dashboard-data-rpc.sql` - Creates RPC function for batched queries
3. `workspace-members-profile-policy.sql` - Sets up RLS policies
4. `invitation-accept-policy.sql` - Sets up invitation policies
5. `create-workspace-logos-bucket.sql` - Creates storage bucket

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

