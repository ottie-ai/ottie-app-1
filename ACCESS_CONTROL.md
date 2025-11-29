# Access Control Configuration

Tento dokument popisuje, ako nastaviť obmedzenie prístupu na vašu doménu alebo IP adresu.

## Prehľad

Middleware podporuje dva režimy prístupu:
- **`public`** - Verejný prístup (predvolené)
- **`restricted`** - Obmedzený prístup len na povolené domény/IP adresy

## Konfigurácia

### Environment Variables

Nastavte tieto premenné prostredia v Vercel (alebo lokálne v `.env.local`):

#### `ACCESS_MODE`
- **Hodnoty:** `public` | `restricted`
- **Predvolené:** `public`
- **Popis:** Režim prístupu k aplikácii

#### `ALLOWED_DOMAINS`
- **Formát:** Zoznam domén oddelených čiarkou
- **Príklad:** `example.com,app.example.com,www.example.com`
- **Popis:** Povolené domény (presná zhoda alebo subdomény)

#### `ALLOWED_IPS`
- **Formát:** Zoznam IP adries oddelených čiarkou
- **Príklad:** `1.2.3.4,5.6.7.8,192.168.1.1`
- **Popis:** Povolené IP adresy

## Príklady použitia

### Príklad 1: Obmedzenie len na vašu doménu

```bash
ACCESS_MODE=restricted
ALLOWED_DOMAINS=mojadomena.sk,app.mojadomena.sk
ALLOWED_IPS=
```

### Príklad 2: Obmedzenie len na vašu IP adresu

```bash
ACCESS_MODE=restricted
ALLOWED_DOMAINS=
ALLOWED_IPS=123.45.67.89
```

### Príklad 3: Kombinácia domény a IP

```bash
ACCESS_MODE=restricted
ALLOWED_DOMAINS=mojadomena.sk
ALLOWED_IPS=123.45.67.89,98.76.54.32
```

**Poznámka:** Ak je `ACCESS_MODE=restricted` a obe zoznamy (`ALLOWED_DOMAINS` a `ALLOWED_IPS`) sú prázdne, prístup je povolený všetkým (kvôli bezpečnosti pri vývoji).

## Nastavenie v Vercel

1. Prejdite do Vercel Dashboard → Váš projekt → Settings → Environment Variables
2. Pridajte premenné:
   - `ACCESS_MODE` = `restricted`
   - `ALLOWED_DOMAINS` = `mojadomena.sk,app.mojadomena.sk` (vaša doména)
   - `ALLOWED_IPS` = `vaša-ip-adresa` (voliteľné)
3. Redeploy aplikáciu

## Prepínanie medzi režimami

### Zapnúť obmedzený prístup:
```bash
ACCESS_MODE=restricted
ALLOWED_DOMAINS=mojadomena.sk
```

### Vypnúť obmedzený prístup (verejný prístup):
```bash
ACCESS_MODE=public
```

## Ako to funguje

1. Middleware kontroluje `ACCESS_MODE` na začiatku každého requestu
2. Ak je `public`, všetky requesty sú povolené
3. Ak je `restricted`, kontroluje sa:
   - Hostname (doména) proti `ALLOWED_DOMAINS`
   - IP adresa proti `ALLOWED_IPS`
4. Ak žiadna kontrola neprejde, vráti sa HTTP 403 Forbidden

## Poznámky

- IP adresa sa získava z `x-forwarded-for` alebo `x-real-ip` headrov (Vercel automaticky nastavuje)
- Subdomény sa automaticky kontrolujú (napr. `app.example.com` je povolené, ak je `example.com` v zozname)
- `www.` prefix sa automaticky ignoruje pri kontrole
- Lokálny vývoj (`localhost`) je vždy povolený, aj keď je `ACCESS_MODE=restricted`

