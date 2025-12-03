# 🌐 Public Sites Setup - RLS Policy

## Problém

Keď anonymous user (neprihlásený) navštívi client site (napr. `testujem.ottie.site`), Supabase RLS policies blokujú prístup k `sites` table, pretože všetky existujúce policies vyžadujú autentifikovaného usera (`auth.uid()`).

**Výsledok:** Site sa nenájde (0 rows) a user je redirectovaný na `ottie.com`.

## Riešenie

Pridať RLS policy, ktorá umožňuje **public read access** na **published sites** na `ottie.site` domain.

## 📝 Kroky

### 1. Spustiť SQL Migration

1. Otvorte [Supabase Dashboard](https://supabase.com/dashboard)
2. Vyberte váš projekt
3. Prejdite na **SQL Editor** (ľavý sidebar)
4. Kliknite **New Query**
5. Paste tento SQL (už je v clipboard):

```sql
-- SQL je v súbore: supabase/add-public-sites-rls-policy.sql
-- Alebo spustite: cat supabase/add-public-sites-rls-policy.sql | pbcopy
```

6. Kliknite **Run** (alebo Cmd+Enter)
7. Skontrolujte output - malo by byť:
   ```
   Success. No rows returned
   CREATE POLICY
   CREATE INDEX
   ```

### 2. Overiť Policy

V Supabase Dashboard:
1. **Database** → **Policies**
2. Nájdite table `sites`
3. Mala by tam byť nová policy: **"Public can view published sites on ottie.site"**
4. Type: `SELECT` (Permissive)

### 3. Otestovať

1. Uistite sa, že váš site má:
   - `status = 'published'`
   - `domain = 'ottie.site'`
   - `deleted_at IS NULL`

2. Navštívte: `https://{slug}.ottie.site`

3. Site by sa mal načítať! ✅

## 🔍 Debugging

Ak site stále nefunguje:

### Skontrolovať Site v Database

```sql
SELECT id, title, slug, status, domain, deleted_at
FROM sites
WHERE slug = 'testujem';
```

**Očakávaný výsledok:**
- `status`: `'published'`
- `domain`: `'ottie.site'`
- `deleted_at`: `NULL`

### Skontrolovať RLS Policy

```sql
SELECT * FROM pg_policies
WHERE tablename = 'sites'
AND policyname = 'Public can view published sites on ottie.site';
```

**Očakávaný výsledok:** 1 row

### Test Query (ako anonymous user)

V Supabase SQL Editor, spustite:

```sql
-- Simulate anonymous user (no auth.uid())
SELECT id, title, slug, status, domain
FROM sites
WHERE slug = 'testujem'
  AND domain = 'ottie.site'
  AND status = 'published'
  AND deleted_at IS NULL;
```

**Očakávaný výsledok:** 1 row (váš site)

Ak dostanete 0 rows, RLS policy nie je správne nastavená.

## 📊 Performance

Policy používa jednoduchú podmienku bez EXISTS subqueries, takže je veľmi rýchla.

Index `idx_sites_public_access` zabezpečuje efektívne vyhľadávanie.

## 🔒 Security

- ✅ Len **published** sites sú prístupné
- ✅ Len sites na **ottie.site** domain
- ✅ Len **non-deleted** sites
- ✅ Len **SELECT** (read-only) - anonymous users nemôžu meniť dáta
- ✅ Draft sites zostávajú **private** (vyžadujú autentifikáciu)

## 🚀 Custom Domains (TODO)

Ak chcete podporiť custom domains (napr. `mojadomena.sk`), budete musieť:

1. Upraviť policy:
   ```sql
   -- Remove: AND domain = 'ottie.site'
   -- Or add: OR (domain = 'custom' AND custom_domain IS NOT NULL)
   ```

2. Pridať custom domain handling do middleware

3. Nastaviť DNS records pre custom domains

## 📚 Related Files

- `supabase/add-public-sites-rls-policy.sql` - SQL migration
- `supabase/sites-rls-policies.sql` - Existujúce RLS policies
- `app/(z-sites)/[site]/page.tsx` - Client site page
- `middleware.ts` - Subdomain routing

## ✅ Checklist

- [ ] Spustil som SQL migration v Supabase SQL Editor
- [ ] Policy sa vytvorila úspešne (žiadne errors)
- [ ] Overil som, že policy existuje v Database → Policies
- [ ] Overil som, že môj site má `status='published'` a `domain='ottie.site'`
- [ ] Navštívil som `https://{slug}.ottie.site` a site sa načítal ✅

