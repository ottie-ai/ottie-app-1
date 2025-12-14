# Published Sites Security

This document describes the security architecture for published sites and how we prevent unauthorized access to the system.

## Overview

Published sites are public-facing pages that don't require authentication. However, we must ensure that:

1. **No sensitive data is exposed** (passwords, API keys, internal IDs)
2. **Only published sites are accessible** (drafts remain private)
3. **RLS (Row Level Security) policies are enforced** at the database level
4. **Server actions require authentication** for any modifications
5. **Password hashes are never exposed** to client components

## Security Layers

### 1. Database Level (RLS Policies)

**Row Level Security (RLS)** is enforced at the database level to prevent unauthorized access:

#### For ottie.site subdomains:
```sql
CREATE POLICY "Public can view published sites on ottie.site"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND status = 'published'
  AND domain = 'ottie.site'
);
```

#### For brand domains:
```sql
CREATE POLICY "Public can view published sites on brand domains"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND status = 'published'
  AND domain != 'ottie.site'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = sites.workspace_id
    AND w.deleted_at IS NULL
    AND (w.branding_config->>'custom_brand_domain') = sites.domain
    AND (w.branding_config->>'custom_brand_domain_verified') = 'true'
  )
);
```

**What this means:**
- Unauthenticated users can ONLY read (SELECT) published sites
- They CANNOT update, delete, or create sites
- Only sites with `status = 'published'` are accessible
- Brand domains must be verified in workspace settings

### 2. Application Level (Server Components)

#### Query Filtering

The `getSiteConfig` function in `app/(z-sites)/[site]/page.tsx` adds additional filters:

```typescript
let query = supabase
  .from('sites')
  .select('*, password_protected')  // NOTE: password_hash is NOT selected
  .eq('slug', slug)
  .eq('status', 'published')      // Only published sites
  .is('deleted_at', null)          // Only non-deleted sites
```

**Security measures:**
- ✅ Only `status = 'published'` sites are queried
- ✅ `password_hash` is NOT selected (never exposed to client)
- ✅ Soft-deleted sites are excluded
- ✅ Domain filtering ensures correct site is returned

#### Password Hash Protection

**CRITICAL:** Password hashes are NEVER returned in SELECT queries for published sites.

- Password hash is only fetched in `verifySitePassword` server action
- Server action runs on server, never exposed to client
- Password verification uses bcrypt.compare() on server side only

### 3. Server Actions (Authentication Required)

All server actions that modify sites require authentication:

```typescript
async function verifySiteAccess(siteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Verify workspace membership
  // ...
}
```

**Protected actions:**
- `handleArchiveSite` - Requires workspace membership
- `handleUnarchiveSite` - Requires workspace membership
- `handleDeleteSite` - Requires workspace membership
- `handlePublishSite` - Requires workspace membership
- `handleSetSitePassword` - Requires workspace membership + plan feature
- `handleUpdateSiteFont` - Requires workspace membership

**What this means:**
- Public users CANNOT call these actions
- Only authenticated workspace members can modify sites
- Each action verifies user permissions before executing

### 4. Client Components (No Sensitive Data)

Published site components (`PublishedSitePage`) have:

- ✅ **NO admin dependencies** - No workspace context, no auth context
- ✅ **NO sensitive data** - Only public fields are passed to client:
  - `id` - Only for password check component
  - `title` - Public site title
  - `slug` - Public slug
  - `status` - Always 'published' at this point
  - `config` - Public config (theme, sections)
  - `password_protected` - Boolean flag only (no hash)
- ✅ **NO internal IDs** - `workspace_id`, `creator_id`, `assigned_agent_id` are NOT passed
- ✅ **NO password hash** - Never passed to client components
- ✅ **NO API keys** - No environment variables exposed

### 5. Password Protection

Password-protected sites use a separate verification flow:

1. **Client checks cookie** for 24-hour access token
2. **If no cookie**, shows password form
3. **Password form calls** `verifySitePassword` server action
4. **Server action**:
   - Fetches `password_hash` from database (server-side only)
   - Compares with bcrypt.compare() (server-side only)
   - Implements rate limiting (5 attempts per 15 minutes per IP)
   - Sets cookie if password is correct
5. **Client never sees** password hash

**Rate limiting:**
- Prevents brute-force attacks
- Tracks attempts per IP address
- Blocks after 5 failed attempts for 15 minutes

## What Public Users CANNOT Do

1. ❌ **Access unpublished sites** - RLS blocks `status != 'published'`
2. ❌ **Access deleted sites** - RLS blocks `deleted_at IS NOT NULL`
3. ❌ **Modify sites** - All server actions require authentication
4. ❌ **See password hashes** - Never selected in queries
5. ❌ **Access workspace data** - No workspace context in published sites
6. ❌ **Access admin UI** - Published sites use separate components
7. ❌ **Brute-force passwords** - Rate limiting prevents this

## What Public Users CAN Do

1. ✅ **View published sites** - If `status = 'published'`
2. ✅ **Enter password** - For password-protected sites (with rate limiting)
3. ✅ **View site content** - Theme, sections, images (public data only)

## Attack Vectors & Mitigations

### 1. SQL Injection
**Mitigation:**
- Supabase uses parameterized queries
- No raw SQL in application code
- RLS policies are enforced at database level

### 2. Enumeration Attacks
**Mitigation:**
- Redirects don't expose site slugs in URLs
- 404 pages don't reveal if site exists
- Rate limiting on password verification

### 3. Brute-Force Password Attacks
**Mitigation:**
- Rate limiting: 5 attempts per 15 minutes per IP
- Bcrypt hashing (10 rounds)
- Password hashes never exposed to client

### 4. Unauthorized Site Access
**Mitigation:**
- RLS policies enforce `status = 'published'`
- Brand domain verification in RLS policy
- Domain matching in application code

### 5. Data Exposure
**Mitigation:**
- `password_hash` never selected in public queries
- No workspace/internal IDs in client components
- No environment variables in client code

## Testing Security

To verify security:

1. **Test RLS policies:**
   ```sql
   -- As unauthenticated user, should only see published sites
   SET ROLE anon;
   SELECT * FROM sites WHERE status = 'draft'; -- Should return 0 rows
   ```

2. **Test password hash exposure:**
   - Check network tab in browser
   - Verify `password_hash` is NOT in any API responses
   - Verify `password_hash` is NOT in page source

3. **Test server actions:**
   - Try calling server actions without authentication
   - Should return "Unauthorized" error

4. **Test rate limiting:**
   - Enter wrong password 6 times
   - Should be blocked for 15 minutes

## Best Practices

1. **Never select `password_hash`** in public queries
2. **Always verify authentication** in server actions
3. **Use RLS policies** as first line of defense
4. **Implement rate limiting** for password verification
5. **Log security events** (failed password attempts, unauthorized access)
6. **Keep dependencies minimal** in published site components
7. **Never expose internal IDs** in client components

## Related Documentation

- [Site Architecture](./SITE_ARCHITECTURE.md) - Overall architecture
- [Premium Fonts Implementation](./PREMIUM_FONTS_IMPLEMENTATION.md) - Font loading security
- [Supabase RLS Policies](../supabase/) - Database security policies
