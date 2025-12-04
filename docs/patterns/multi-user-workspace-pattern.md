# Multi-User Workspace Pattern

## Overview

Multi-user workspace functionality (invitations, members, role management, site assignment) must be hidden behind a feature flag that checks if the workspace plan supports multiple users.

## Single Source of Truth

The check for multi-user functionality is based on the `max_users` column in the `plans` table:
- **Multi-user workspace**: `max_users > 1`
- **Single-user workspace**: `max_users = 1`

### Important: Owner is Always Counted as a User

**CRITICAL**: When counting users or members in a workspace, the owner is always included in the count. The `max_users` value includes the owner.

- If `max_users = 5`, the workspace can have 1 owner + 4 additional members = 5 total users
- If `max_users = 1`, the workspace can only have 1 owner = 1 total user
- When checking if a workspace exceeds the user limit, count all members (including owner)
- When calculating how many users will lose access during downgrade, count non-owner members vs `(targetMaxUsers - 1)`

**Example:**
```typescript
// ✅ Correct: Count all members (owner is included)
const totalMembers = members.length // Includes owner

// ✅ Correct: Calculate non-owner slots
const nonOwnerSlots = maxUsers - 1 // Owner takes 1 slot
const nonOwnerMembers = members.filter(m => m.membership.role !== 'owner').length

// ❌ Wrong: Don't exclude owner from count
const userCount = members.filter(m => m.membership.role !== 'owner').length
```

## Implementation Pattern

### Always Use `isMultiUserPlan()` from App Context

**Never use hardcoded plan names** (e.g., `plan === 'agency' || plan === 'enterprise'`).

Instead, always use the `isMultiUserPlan()` function from the `useAppData()` hook:

```typescript
import { useAppData } from '@/contexts/app-context'

function MyComponent() {
  const { currentWorkspace, isMultiUserPlan } = useAppData()
  const isMultiUser = currentWorkspace ? isMultiUserPlan(currentWorkspace.plan) : false
  
  // Only show multi-user features when isMultiUser is true
  return (
    <>
      {isMultiUser && (
        <MultiUserFeature />
      )}
    </>
  )
}
```

### Server-Side Checks

For server actions and API routes, use the database check directly:

```typescript
// Get plan from database
const { data: planData } = await supabase
  .from('plans')
  .select('max_users')
  .eq('name', workspace.plan || 'free')
  .single()

// Check if plan supports multiple users
if (planData?.max_users <= 1) {
  return { error: 'This feature requires a multi-user plan' }
}
```

## Features That Must Be Hidden

The following features must be hidden for single-user workspaces (`max_users = 1`):

1. **Workspace Invitations**
   - Creating invitations
   - Viewing pending invitations
   - Canceling/resending invitations
   - Accepting invitations

2. **Workspace Members**
   - Viewing members list
   - Role management (changing member roles)
   - Member avatars/badges in UI

3. **Site Assignment**
   - Assigning sites to agents
   - Reassigning sites
   - "Assigned to" filter in sites list
   - "Assigned Agent" field in site creation form
   - "Assigned To" section in site settings

4. **Role-Based Permissions**
   - Role checks (owner/admin/agent) should only apply in multi-user workspaces
   - In single-user workspaces, all users have full access

## Examples

### ✅ Correct: Using isMultiUserPlan()

```typescript
const { currentWorkspace, isMultiUserPlan } = useAppData()
const isMultiUser = currentWorkspace ? isMultiUserPlan(currentWorkspace.plan) : false

{isMultiUser && (
  <InviteButton />
)}
```

### ❌ Wrong: Hardcoded Plan Names

```typescript
// DON'T DO THIS
const isMultiUser = workspace?.plan === 'agency' || workspace?.plan === 'enterprise'

{isMultiUser && (
  <InviteButton />
)}
```

### ✅ Correct: Server-Side Check

```typescript
const { data: planData } = await supabase
  .from('plans')
  .select('max_users')
  .eq('name', workspace.plan || 'free')
  .single()

if (planData?.max_users <= 1) {
  return { error: 'Upgrade to a team plan to invite team members' }
}
```

### ❌ Wrong: Server-Side Hardcoded Check

```typescript
// DON'T DO THIS
if (workspace.plan !== 'agency' && workspace.plan !== 'enterprise') {
  return { error: 'Upgrade to a team plan' }
}
```

## Files to Update When Adding Multi-User Features

When adding new multi-user functionality, always add the check in these locations:

1. **Client Components**: Use `useAppData().isMultiUserPlan()`
2. **Server Actions**: Check `max_users` from `plans` table
3. **API Routes**: Check `max_users` from `plans` table
4. **Database RLS Policies**: Use `plans.max_users > 1` in policy conditions

## Key Files Reference

- `contexts/app-context.tsx` - Provides `isMultiUserPlan()` helper
- `lib/data/plans.ts` - Contains `isMultiUserPlanFromDB()` function
- `app/(app)/settings/settings-client.tsx` - Example of multi-user feature gating
- `app/(app)/sites/page.tsx` - Example of site assignment gating
- `components/workspace/site-card.tsx` - Example of reassign feature gating

## Testing Checklist

When adding multi-user features, verify:

- [ ] Feature is hidden for single-user workspaces (`max_users = 1`)
- [ ] Feature is visible for multi-user workspaces (`max_users > 1`)
- [ ] Server-side validation checks `max_users` from database
- [ ] No hardcoded plan names are used
- [ ] Error messages mention "upgrade to a team plan" when appropriate

