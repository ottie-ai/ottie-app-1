# 🔒 Security Migrations - Brand Domain Feature

## 📋 Quick Start

**Najrýchlejšia cesta:** Spustiť jeden master skript v Supabase SQL Editor:

```sql
-- Spusti všetko naraz (odporúčané)
supabase/apply-all-security-fixes.sql
```

**Alebo jednotlivo** (v tomto poradí):

```sql
1. supabase/fix-brand-domain-rls-security.sql
2. supabase/add-domain-operations-rate-limiting.sql
3. supabase/add-dns-rebinding-protection.sql
```

---

## 🎯 Čo tieto skripty robia?

### 1. `fix-brand-domain-rls-security.sql`
**Problém:** RLS policy povoľuje prístup bez verifikácie workspace domain status

**Riešenie:**
- ✅ Enhanced RLS policy s workspace verification
- ✅ Index pre performance
- ✅ EXISTS subquery overuje verified status

**Kritickosť:** 🔴 KRITICKÉ

---

### 2. `add-domain-operations-rate-limiting.sql`
**Problém:** Žiadny rate limit na domain operácie = možnosť abuse

**Riešenie:**
- ✅ Tabuľka `domain_operations_log` pre audit
- ✅ Funkcia `check_domain_operation_rate_limit()` 
- ✅ Funkcia `log_domain_operation()`
- ✅ Limity: 5/hr (set), 10/hr (verify), 3/day (remove)
- ✅ Auto-cleanup starých logov (30 dní)

**Kritickosť:** 🟡 VYSOKÉ

---

### 3. `add-dns-rebinding-protection.sql`
**Problém:** Žiadna ochrana proti DNS rebinding, host injection

**Riešenie:**
- ✅ Funkcia `is_valid_brand_domain()` - validácia hostname
- ✅ Blokovanie: IPs, localhost, internal ranges, invalid TLDs
- ✅ Enhanced `get_workspace_by_brand_domain()` so security
- ✅ Tabuľka `domain_verification_history` pre tracking
- ✅ Trigger pre auto-logging zmien

**Kritickosť:** 🔴 KRITICKÉ

---

### 4. `apply-all-security-fixes.sql` (MASTER)
**Účel:** Spustí všetky 3 skripty naraz v správnom poradí

**Výhody:**
- ✅ Jeden príkaz
- ✅ Transaction wrapped (rollback ak zlyhá)
- ✅ Progress messages
- ✅ Summary na konci

---

## 🚀 Inštalácia

### Metóda 1: Master Script (Odporúčané)

1. Otvor **Supabase Dashboard**
2. Prejdi na **SQL Editor**
3. Vytvor nový query
4. Skopíruj obsah `apply-all-security-fixes.sql`
5. Klikni **Run**
6. Skontroluj output messages

**Očakávaný výstup:**
```
========================================
PART 1/3: Enhancing RLS Policy
========================================
✅ RLS policy enhanced successfully

========================================
PART 2/3: Adding Rate Limiting
========================================
✅ Rate limiting added successfully

========================================
PART 3/3: Adding DNS Protection
========================================
✅ DNS protection added successfully

========================================
✅ ALL SECURITY FIXES APPLIED SUCCESSFULLY
========================================
```

---

### Metóda 2: Jednotlivé Skripty

Ak chceš spustiť jednotlivo (napr. debugging):

```sql
-- 1. RLS Enhancement
\i supabase/fix-brand-domain-rls-security.sql

-- 2. Rate Limiting
\i supabase/add-domain-operations-rate-limiting.sql

-- 3. DNS Protection
\i supabase/add-dns-rebinding-protection.sql
```

---

## ✅ Verifikácia

Po spustení over, že všetko funguje:

### 1. Skontroluj nové tabuľky
```sql
SELECT COUNT(*) FROM domain_operations_log;
SELECT COUNT(*) FROM domain_verification_history;
```

### 2. Skontroluj funkcie
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%domain%';

-- Očakávaný output:
-- check_domain_operation_rate_limit
-- log_domain_operation
-- cleanup_old_domain_operation_logs
-- is_valid_brand_domain
-- get_workspace_by_brand_domain
-- log_domain_verification_change
```

### 3. Test rate limiting
```sql
-- Simuluj rate limit check
SELECT check_domain_operation_rate_limit(
  'your-workspace-id'::uuid,
  'set'
);

-- Očakávaný output:
-- {"allowed": true, "current": 0, "limit": 5, "reset_in_minutes": 0}
```

### 4. Test hostname validation
```sql
-- Valid domain
SELECT is_valid_brand_domain('properties.example.com');
-- Output: true

-- Invalid (IP address)
SELECT is_valid_brand_domain('192.168.1.1');
-- Output: false

-- Invalid (localhost)
SELECT is_valid_brand_domain('localhost');
-- Output: false
```

---

## 🔧 Voliteľná Konfigurácia

### Auto-cleanup logov (pg_cron)

Ak máš pg_cron extension:

```sql
-- Aktivuj extension (ak nie je)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Nastav daily cleanup o 2:00
SELECT cron.schedule(
  'cleanup-domain-logs',
  '0 2 * * *',
  'SELECT cleanup_old_domain_operation_logs()'
);

-- Skontroluj scheduled jobs
SELECT * FROM cron.job;
```

### Manuálny cleanup

```sql
-- Zmaž logy staršie ako 30 dní
SELECT cleanup_old_domain_operation_logs();

-- Output: počet zmazaných rows
```

---

## 📊 Monitoring

### Pozri nedávne operácie
```sql
SELECT * FROM recent_domain_operations
ORDER BY created_at DESC
LIMIT 20;
```

### Rate limit stats pre workspace
```sql
SELECT 
  operation_type,
  COUNT(*) as attempts,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failures
FROM domain_operations_log
WHERE workspace_id = 'your-workspace-id'
  AND created_at > now() - interval '24 hours'
GROUP BY operation_type;
```

### Najčastejšie chyby
```sql
SELECT 
  error_message,
  COUNT(*) as count
FROM domain_operations_log
WHERE success = false
  AND created_at > now() - interval '7 days'
GROUP BY error_message
ORDER BY count DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Chyba: "function already exists"
**Riešenie:** Master script používa `CREATE OR REPLACE`, mal by prejsť.

### Chyba: "relation already exists"
**Riešenie:** Master script používa `CREATE TABLE IF NOT EXISTS`, mal by prejsť.

### Chyba: "permission denied"
**Riešenie:** Musíš byť prihlásený ako postgres/supabase admin user.

### Skript zlyhal v strede
**Riešenie:** Master script je wrapped v transaction, mal sa rollbacknúť. Skús znova.

---

## 🗑️ Rollback (Nie odporúčané)

Ak naozaj potrebuješ rollbacknúť (nie je odporúčané - tieto sú security fixes):

```sql
-- WARNING: Toto odstráni security fixes!

-- Drop policies
DROP POLICY IF EXISTS "Public can view published sites on brand domains" ON public.sites;

-- Drop functions
DROP FUNCTION IF EXISTS check_domain_operation_rate_limit(uuid, text);
DROP FUNCTION IF EXISTS log_domain_operation(uuid, uuid, text, text, boolean, text);
DROP FUNCTION IF EXISTS cleanup_old_domain_operation_logs();
DROP FUNCTION IF EXISTS is_valid_brand_domain(text);
DROP FUNCTION IF EXISTS get_workspace_by_brand_domain(text);
DROP FUNCTION IF EXISTS log_domain_verification_change();

-- Drop triggers
DROP TRIGGER IF EXISTS log_domain_verification_change_trigger ON public.workspaces;

-- Drop tables
DROP TABLE IF EXISTS domain_operations_log CASCADE;
DROP TABLE IF EXISTS domain_verification_history CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_workspaces_brand_domain_lookup;
DROP INDEX IF EXISTS idx_domain_operations_workspace_type_created;
DROP INDEX IF EXISTS idx_domain_operations_created_at;
DROP INDEX IF EXISTS idx_domain_verification_history_workspace_domain;
```

---

## 📚 Ďalšie Informácie

- **Audit Report:** `docs/SECURITY_IMPLEMENTATION_COMPLETE.md`
- **Odporúčania:** `docs/SECURITY_BRAND_DOMAIN_RECOMMENDATIONS.md`
- **Code Changes:** Git diff súborov v `app/` a `lib/`

---

**Posledná aktualizácia:** 2025-12-05
**Status:** ✅ PRODUCTION READY
**Next Action:** Spusti `apply-all-security-fixes.sql` v Supabase


