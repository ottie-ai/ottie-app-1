# Security Recommendations: Brand Domain Feature

## ✅ FIXED Issues (Applied in this audit)

### 1. Information Disclosure via Logging (FIXED)
- **Files:** `lib/data/brand-domain-data.ts`, `app/(z-sites)/[site]/page.tsx`, `middleware.ts`
- **Fix:** All production logs now wrapped in `process.env.NODE_ENV === 'development'` checks
- **Status:** ✅ Complete

### 2. Site Enumeration via Redirect URL (FIXED)
- **File:** `app/(z-sites)/[site]/page.tsx`
- **Fix:** Removed `?site=` query parameter from redirect URLs
- **Status:** ✅ Complete

### 3. Subdomain Depth Validation (FIXED)
- **File:** `app/(app)/settings/brand-domain-actions.ts`
- **Fix:** Added validation for:
  - Maximum 5 domain parts (4 subdomain levels)
  - Maximum 63 characters per label
  - Maximum 253 characters total
- **Status:** ✅ Complete

### 4. Phishing Pattern Detection (FIXED)
- **File:** `app/(app)/settings/brand-domain-actions.ts`
- **Fix:** Added blocklist for suspicious subdomain patterns:
  - Login/auth related: login, signin, auth, secure, verify, etc.
  - System related: admin, root, support, mail, etc.
  - Sensitive data: password, credential, billing, etc.
- **Status:** ✅ Complete

## ⚠️ Issues Requiring Manual Action

### 5. RLS Policy Enhancement (CRITICAL - NEEDS DB UPDATE)
- **File:** `supabase/fix-brand-domain-rls-security.sql`
- **Issue:** Current RLS policy doesn't verify workspace brand domain status
- **Action Required:** Run the SQL script in Supabase Dashboard

```bash
# Go to Supabase Dashboard > SQL Editor
# Run: supabase/fix-brand-domain-rls-security.sql
```

### 6. Domain Ownership Verification (HIGH - NOT YET IMPLEMENTED)

**Current State:** Domain verification only checks if DNS points to Vercel.

**Risk:** Attacker could set up a domain they don't own if they can manipulate DNS.

**Recommendation:** Add TXT record verification with a unique workspace-specific token.

```
Implementation:
1. Generate unique verification token for each workspace
2. Require user to add TXT record: _ottie-verification.subdomain.domain.com
3. Value: ottie-verification=<sha256(workspace_id + secret)>
4. Verify TXT record before marking domain as verified
```

### 7. Rate Limiting for Domain Operations (MEDIUM - NOT YET IMPLEMENTED)

**Current State:** No rate limiting on domain add/verify/remove operations.

**Risk:** Attacker could abuse Vercel API or enumerate domains.

**Recommendation:** Add rate limiting:
- Max 5 domain set attempts per workspace per hour
- Max 10 verification checks per workspace per hour
- Max 3 domain removals per workspace per day

## Already Implemented Security Measures ✅

1. **Permission Checks:** Only owner/admin can manage brand domains
2. **Feature Flag:** Plan must include brand domain feature
3. **Reserved Domains:** Ottie domains are protected
4. **Duplicate Check:** Same domain can't be used by multiple workspaces
5. **Vercel API Check:** Domain must not exist in other Vercel projects
6. **www Normalization:** Domains stored without www prefix
7. **RLS Policies:** Database-level access control
8. **Subdomain Validation:** Format, depth, and length checks
9. **Phishing Pattern Blocklist:** Suspicious subdomain names blocked
10. **Production Logging:** Sensitive info only logged in development

## Database Security Enhancements

See: `supabase/fix-brand-domain-rls-security.sql`

- Enhanced RLS policy to verify workspace brand domain verification status
- Added index for performance on brand domain lookups

