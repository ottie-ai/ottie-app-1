# Supabase Database Integration

## Database Schema

Tento projekt používa nasledujúcu databázovú schému v Supabase:

### Tabuľky
- `profiles` - User profiles (auto-created from auth.users)
- `workspaces` - Companies/Organizations
- `memberships` - User-Workspace relationships
- `sites` - Property websites
- `invitations` - Team invitations
- `integrations` - CRM integrations
- `plans` - Subscription plans (free, starter, growth, agency, enterprise)

### Enums
- `user_role`: 'owner' | 'admin' | 'agent'
- `sub_plan`: 'free' | 'starter' | 'growth' | 'agency' | 'enterprise'
- `site_status`: 'draft' | 'published' | 'archived'
- `invite_status`: 'pending' | 'accepted' | 'expired'

## Setup

1. **Spustite SQL migráciu:**
   - Otvorte Supabase Dashboard → SQL Editor
   - Skopírujte obsah `supabase/schema.sql`
   - Spustite SQL

2. **Nastavte environment variables:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

## Použitie

### TypeScript Types
```typescript
import type { Site, Workspace, Profile } from '@/types/database'
```

### Query Functions
```typescript
import { getSites, createSite, updateSite } from '@/lib/supabase/queries'

// Get all sites for current user's workspace
const sites = await getSites()

// Create a new site
const newSite = await createSite({
  workspace_id: '...',
  title: 'My Property',
  slug: 'my-property',
  // ...
})
```

## RLS Policies

Všetky tabuľky majú RLS (Row Level Security) zapnuté:
- Používatelia vidia len dáta z ich workspace
- Soft delete (deleted_at) filtruje zmazané záznamy
- Role-based access (owner/admin/agent)

## Testovanie

Otvorte `/test-db` v prehliadači alebo zavolajte `/api/test-db` endpoint na testovanie pripojenia.

