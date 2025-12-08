# Workspace Subscription Lock Migration Guide

Tento dokument popisuje migráciu pre workspace subscription lock funkcionalitu.

## Prehľad

Táto migrácia pridáva:
- **Membership status** - sledovanie aktívnych/neaktívnych členov
- **Workspace subscription tracking** - sledovanie stavu predplatného, limitov sedadiel a grace period
- **RLS policies** - obmedzenie prístupu na základe subscription statusu
- **Automatické výpočty** - trigger na automatické aktualizovanie seats_used

## Poradie spustenia migrácií

Spustite migrácie v tomto poradí:

### 1. Pridanie membership status
```sql
\i supabase/add-membership-status.sql
```

### 2. Pridanie workspace subscription tracking
```sql
\i supabase/add-workspace-subscription-tracking.sql
```

### 3. Vytvorenie funkcií pre výpočet seats_used
```sql
\i supabase/calculate-seats-used-function.sql
```

### 4. Aktualizácia RLS policies
```sql
\i supabase/add-workspace-lock-rls.sql
```

### 5. Inicializácia existujúcich dát
```sql
\i supabase/migrate-workspace-subscription-lock.sql
```

## Čo každá migrácia robí

### add-membership-status.sql
- Pridáva `status` stĺpec do `memberships` tabuľky
- Hodnoty: `'active'`, `'inactive'`, `'suspended'`
- Nastaví všetky existujúce memberships na `'active'`

### add-workspace-subscription-tracking.sql
- Pridáva `subscription_status` do `workspaces` tabuľky
- Pridáva `seats_limit` a `seats_used` pre sledovanie počtu používateľov
- Pridáva `grace_period_ends_at` a `subscription_locked_at` pre tracking lock stavu

### calculate-seats-used-function.sql
- Vytvára funkciu `calculate_workspace_seats_used()` na výpočet aktívnych sedadiel
- Vytvára trigger `trigger_update_seats_used` na automatické aktualizovanie `seats_used` pri zmene memberships

### add-workspace-lock-rls.sql
- Aktualizuje RLS policies pre `memberships` a `workspaces`
- Owner má vždy prístup (aj keď je workspace locked)
- Aktívni členovia majú prístup len ak workspace nie je locked
- Neaktívni/suspended členovia nemajú prístup

### migrate-workspace-subscription-lock.sql
- Inicializuje `seats_limit` z plánov
- Inicializuje `seats_used` z aktívnych memberships
- Nastaví `subscription_status` na `'active'` pre všetky existujúce workspaces

## Overenie migrácie

Po spustení všetkých migrácií, skontrolujte:

```sql
-- Skontrolujte, že všetky workspaces majú nastavené hodnoty
SELECT 
  id,
  name,
  plan,
  subscription_status,
  seats_limit,
  seats_used,
  CASE 
    WHEN seats_limit IS NULL THEN 'ERROR: seats_limit is NULL'
    WHEN seats_used IS NULL THEN 'ERROR: seats_used is NULL'
    WHEN subscription_status IS NULL THEN 'ERROR: subscription_status is NULL'
    WHEN seats_used > seats_limit THEN 'WARNING: Over seat limit'
    ELSE 'OK'
  END as status
FROM workspaces
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Skontrolujte, že všetky memberships majú status
SELECT 
  status,
  COUNT(*) as count
FROM memberships
GROUP BY status;
```

## Rollback (ak je potrebné)

Ak potrebujete vrátiť migráciu späť:

```sql
-- Odstrániť trigger
DROP TRIGGER IF EXISTS trigger_update_seats_used ON public.memberships;

-- Odstrániť funkcie
DROP FUNCTION IF EXISTS update_workspace_seats_used();
DROP FUNCTION IF EXISTS calculate_workspace_seats_used(uuid);

-- Odstrániť RLS policies
DROP POLICY IF EXISTS "Active members or owners can access workspace" ON public.memberships;
DROP POLICY IF EXISTS "Access workspace based on subscription" ON public.workspaces;

-- Odstrániť stĺpce (POZOR: stratíte dáta!)
-- ALTER TABLE public.memberships DROP COLUMN IF EXISTS status;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS subscription_status;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS seats_limit;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS seats_used;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS grace_period_ends_at;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS subscription_locked_at;
```

## Poznámky

- Všetky existujúce workspaces budú mať `subscription_status = 'active'` po migrácii
- Všetky existujúce memberships budú mať `status = 'active'` po migrácii
- `seats_limit` sa automaticky nastaví z plánu workspace
- `seats_used` sa automaticky vypočíta z aktívnych memberships
- Trigger automaticky aktualizuje `seats_used` pri každej zmene memberships



