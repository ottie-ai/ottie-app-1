# Security Migrations - Quick Start Guide

## 📋 Nutné SQL Migrácie

Po implementácii bezpečnostných opráv je potrebné spustiť tieto SQL skripty v Supabase.

---

## 🚀 Ako Spustiť

### 1. Otvor Supabase Dashboard
```
https://supabase.com/dashboard/project/YOUR-PROJECT-ID
```

### 2. Choď na SQL Editor
```
Dashboard > SQL Editor > New Query
```

### 3. Spusti Tieto Skripty (v poradí)

#### ✅ POVINNÉ - Password Verification Rate Limiting
```sql
-- Skopíruj a spusti celý obsah súboru:
supabase/add-password-verification-rate-limiting.sql
```

**Čo vytvára:**
- Tabuľku `password_verification_attempts`
- Rate limiting na site password verification
- Cleanup funkciu pre staré záznamy

**Účel:** Prevencia brute-force útokov na site passwords

---

#### 🔄 VOLITEĽNÉ - Distributed Rate Limiting
```sql
-- Skopíruj a spusti celý obsah súboru:
supabase/add-distributed-rate-limiting.sql
```

**Čo vytvára:**
- Tabuľku `rate_limit_records`
- Distribuované rate limiting pre middleware
- Cleanup funkciu

**Účel:** Príprava na migráciu middleware rate limitingu z in-memory na DB-backed

**Poznámka:** Tento skript zatiaľ nie je aktívne používaný v kóde, ale je pripravený na budúcu implementáciu.

---

## ✅ Verifikácia

### Skontroluj, že migrácie bežali úspešne:

```sql
-- 1. Over že tabuľky existujú
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('password_verification_attempts', 'rate_limit_records');

-- 2. Over že funkcie existujú
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'check_password_verification_rate_limit',
    'log_password_verification_attempt',
    'cleanup_old_password_attempts',
    'check_and_update_rate_limit',
    'cleanup_old_rate_limits'
  );

-- 3. Test password verification rate limit
SELECT check_password_verification_rate_limit(
  'test-site-id'::uuid,
  '1.2.3.4'
);
```

**Očakávaný výstup:**
```json
{
  "allowed": true,
  "failed_count": 0,
  "limit": 5
}
```

---

## 🧪 Testovanie Rate Limitingu

### Test 1: Password Verification
```sql
-- Simuluj neúspešné pokusy
DO $$
DECLARE
  i INT;
  site_id UUID := '00000000-0000-0000-0000-000000000001'::uuid; -- Nahraď skutočným ID
  test_ip TEXT := '192.168.1.100';
BEGIN
  FOR i IN 1..6 LOOP
    -- Zaloguj neúspešný pokus
    PERFORM log_password_verification_attempt(site_id, test_ip, false);
    RAISE NOTICE 'Attempt %', i;
  END LOOP;
END $$;

-- Skontroluj rate limit
SELECT check_password_verification_rate_limit(
  '00000000-0000-0000-0000-000000000001'::uuid,
  '192.168.1.100'
);

-- Mali by si dostať:
-- {"allowed": false, "error": "Too many failed attempts...", ...}
```

### Test 2: Distributed Rate Limiting
```sql
-- Test základného rate limitingu
SELECT check_and_update_rate_limit(
  '1.2.3.4',        -- IP address
  '/api/test',      -- Endpoint
  10,               -- Limit: 10 requests
  60                -- Window: 60 seconds
);

-- Mali by si dostať:
-- {"allowed": true, "current_count": 1, "limit": 10, ...}
```

---

## 🧹 Maintenance

### Automatic Cleanup

Oba skripty obsahujú cleanup funkcie:

```sql
-- Cleanup password verification attempts (starších ako 7 dní)
SELECT cleanup_old_password_attempts();

-- Cleanup rate limit records (starších ako 1 hodina)
SELECT cleanup_old_rate_limits();
```

### Manuálne Spustenie Cleanup

Môžeš nastaviť cron job (ak máš pg_cron extension):

```sql
-- Denne o 2:00 AM cleanup password attempts
SELECT cron.schedule(
  'cleanup-password-attempts',
  '0 2 * * *',
  'SELECT cleanup_old_password_attempts()'
);

-- Každú hodinu cleanup rate limits
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  'SELECT cleanup_old_rate_limits()'
);
```

---

## 📊 Monitoring Queries

### Password Verification Stats

```sql
-- Brute-force attempts za posledných 24 hodín
SELECT 
  ip_address,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed,
  COUNT(DISTINCT site_id) as different_sites
FROM password_verification_attempts
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) >= 5
ORDER BY failed DESC;
```

### Rate Limit Stats

```sql
-- Active rate limit windows
SELECT 
  endpoint,
  COUNT(DISTINCT ip_address) as unique_ips,
  SUM(request_count) as total_requests,
  MAX(request_count) as max_per_ip
FROM rate_limit_records
WHERE window_end > now()
GROUP BY endpoint
ORDER BY total_requests DESC;
```

---

## ❌ Rollback (v prípade problémov)

Ak niečo zlyhá, môžeš rollback migrácie:

```sql
-- Rollback password verification rate limiting
DROP TABLE IF EXISTS password_verification_attempts CASCADE;
DROP FUNCTION IF EXISTS check_password_verification_rate_limit(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_password_verification_attempt(UUID, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_password_attempts() CASCADE;

-- Rollback distributed rate limiting
DROP TABLE IF EXISTS rate_limit_records CASCADE;
DROP FUNCTION IF EXISTS check_and_update_rate_limit(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_rate_limits() CASCADE;
```

---

## 📝 Poznámky

### Password Verification Rate Limiting
- **Limit:** 5 neúspešných pokusov / 15 minút / IP / site
- **Cleanup:** Po 7 dňoch
- **Použité v:** `app/actions/site-actions.ts` -> `verifySitePassword()`

### Distributed Rate Limiting
- **Status:** Pripravené, ale zatiaľ nepoužité v kóde
- **Účel:** Budúca náhrada in-memory rate limitingu v middleware
- **Cleanup:** Po 1 hodine

---

## 🆘 Troubleshooting

### "Permission denied for table..."
```sql
-- Skontroluj RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('password_verification_attempts', 'rate_limit_records');

-- Mali by existovať policies pre authenticated a anon
```

### "Function does not exist..."
```sql
-- Skontroluj že funkcie majú správny search_path
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%rate_limit%';
```

### "Rate limit not working"
```sql
-- Debug rate limit check
SELECT check_password_verification_rate_limit(
  'site-id-here'::uuid,
  'ip-here'
);

-- Skontroluj logy
SELECT * FROM password_verification_attempts
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Checklist Pre Dokončenie

- [ ] Spustil som `add-password-verification-rate-limiting.sql`
- [ ] Overil som že tabuľka `password_verification_attempts` existuje
- [ ] Overil som že funkcie existujú (query vyššie)
- [ ] Otestoval som rate limiting (test query vyššie)
- [ ] (Voliteľné) Spustil som `add-distributed-rate-limiting.sql`
- [ ] Nastavil som cron cleanup jobs (voliteľné)

---

**Posledná aktualizácia:** 2025-12-09



