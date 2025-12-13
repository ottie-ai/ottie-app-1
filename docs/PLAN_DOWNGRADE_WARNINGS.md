# Plan Downgrade Warnings

## Overview

When a user downgrades from a paid plan to a lower tier (including free), the system displays warnings about what will happen to their workspace resources (sites, members, features) before confirming the downgrade.

## Implementation

Downgrade warnings are calculated in the `getDowngradeInfo()` function in `components/workspace/pricing-dialog.tsx`. The function checks:

1. **Team members** - How many users will lose access
2. **Sites** - How many sites will be archived (varies by target plan)
3. **Password protection** - Sites that will lose password protection
4. **Brand domain** - Custom brand domain that will be removed

## Site Archiving Logic

The site archiving logic differs based on the target plan:

### Free Plan (Special Case)

**Target Plan**: `free` with `max_sites = 1`

- **Sites counted**: ALL sites (published, draft, archived)
- **Limit**: 1 site total (regardless of status)
- **Warning message**: "All sites except the newest one (X site(s)) will be archived."
- **Archiving behavior**: All sites except the newest one (by `updated_at`) are archived

**Why**: Free plan can only have 1 site total, regardless of status. This is a hard limit.

**Example**:
- User has 3 sites: 1 published, 1 draft, 1 archived
- Downgrading to free → Warning: "All sites except the newest one (2 sites) will be archived."
- Result: Only the newest site remains, other 2 are archived

### Other Plans (Paid Plans)

**Target Plans**: `starter`, `growth`, `agency`, `enterprise`

- **Sites counted**: Active sites only (published + draft)
- **Limit**: `max_sites` from plan configuration
- **Warning message**: "Active sites above the plan limit (X site(s)) will be archived."
- **Archiving behavior**: Only active sites (published + draft) beyond the limit are archived, keeping the newest ones

**Why**: Paid plans count only active sites (published + draft) toward the limit. Archived sites don't count.

**Example**:
- User has 5 sites: 3 published, 1 draft, 1 archived
- Downgrading to starter (max_sites = 2) → Warning: "Active sites above the plan limit (2 sites) will be archived."
- Result: 2 newest active sites remain, 2 oldest active sites are archived, archived site stays archived

## Code Reference

### Frontend Warning Calculation

```typescript
// components/workspace/pricing-dialog.tsx
const getDowngradeInfo = (targetTierId: string) => {
  const targetMaxSites = getMaxSites(targetTierId)
  const isFreePlan = targetTierId === 'free' && targetMaxSites === 1
  
  if (isFreePlan) {
    // For free plan, check ALL sites (published, draft, archived)
    const totalSites = sites.length
    if (totalSites > targetMaxSites) {
      const sitesToArchive = totalSites - targetMaxSites
      warnings.push(
        `All sites except the newest one (${sitesToArchive} site${sitesToArchive > 1 ? 's' : ''}) will be archived.`
      )
    }
  } else {
    // For other plans, check active sites (published + draft)
    const activeSites = sites.filter(s => s.status === 'published' || s.status === 'draft')
    const totalActiveSites = activeSites.length
    
    if (totalActiveSites > targetMaxSites) {
      const sitesToArchive = totalActiveSites - targetMaxSites
      warnings.push(
        `Active sites above the plan limit (${sitesToArchive} site${sitesToArchive > 1 ? 's' : ''}) will be archived.`
      )
    }
  }
}
```

### Backend Archiving Logic

```typescript
// lib/data/site-data.ts
export async function archiveSitesBeyondLimit(
  workspaceId: string,
  maxSites: number,
  planName?: string | null
): Promise<{ success: true; archivedCount: number } | { error: string }> {
  const isFreePlan = planName === 'free' || !planName
  
  if (isFreePlan && maxSites === 1) {
    // For free plan, archive ALL sites except the newest one (regardless of status)
    const { data: allSites } = await supabase
      .from('sites')
      .select('id, slug, metadata, updated_at')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
    
    // Archive all sites except the newest one
    const sitesToArchive = allSites.slice(1)
    // ... archive logic
  } else {
    // For other plans, archive only active sites (published + draft) beyond limit
    const { data: activeSites } = await supabase
      .from('sites')
      .select('id, slug, metadata, updated_at')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .in('status', ['published', 'draft'])
      .order('updated_at', { ascending: false })
    
    // Archive sites beyond the limit (oldest ones)
    const sitesToArchive = activeSites.slice(maxSites)
    // ... archive logic
  }
}
```

## User Experience

### Downgrade Confirmation Dialog

When a user clicks "Downgrade" on a lower-tier plan, they see:

1. **Dialog title**: "Confirm Downgrade"
2. **Warnings section** (red background): Critical issues that will occur
   - Sites that will be archived
   - Users that will lose access
   - Password protection that will be removed
   - Brand domain that will be removed
3. **Info section** (gray background): Plan changes (e.g., team seats reduction)
4. **Action buttons**: "Cancel" and "Confirm Downgrade" (destructive variant)

### Warning Messages

**Free Plan Downgrade**:
- "All sites except the newest one (X site(s)) will be archived."

**Other Plan Downgrade**:
- "Active sites above the plan limit (X site(s)) will be archived."
- "Other users (X) will lose access to the workspace."
- "Password protection will be removed from X site(s). All sites will become publicly accessible."
- "Brand domain removed"

## Key Differences Summary

| Aspect | Free Plan | Other Plans |
|--------|-----------|-------------|
| **Sites counted** | ALL sites (published, draft, archived) | Active sites only (published + draft) |
| **Limit** | 1 site total | `max_sites` from plan |
| **Archived sites** | Counted toward limit | Don't count toward limit |
| **Warning message** | "All sites except the newest one..." | "Active sites above the plan limit..." |

## Testing Checklist

When testing downgrade warnings:

- [ ] Free plan downgrade shows warning for ALL sites (not just published)
- [ ] Other plan downgrade shows warning only for active sites (published + draft)
- [ ] Archived sites are not counted for paid plans
- [ ] Warning message shows correct count of sites to be archived
- [ ] Warning appears before downgrade confirmation
- [ ] Actual archiving matches the warning (test after downgrade)

## Related Files

- `components/workspace/pricing-dialog.tsx` - Frontend warning calculation and UI
- `lib/data/site-data.ts` - Backend archiving logic (`archiveSitesBeyondLimit`)
- `app/(app)/settings/actions.ts` - Downgrade action (`handleDowngradeWorkspacePlan`)
