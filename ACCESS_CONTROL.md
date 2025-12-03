# Access Control Configuration

Tento dokument popisuje, ako nastaviť obmedzenie prístupu na vašu doménu alebo IP adresu.

## Prehľad

Middleware podporuje dva režimy prístupu:
- **`public`** - Verejný prístup (predvolené)
- **`restricted`** - Obmedzený prístup len na povolené domény/IP adresy

## Konfigurácia

### Environment Variables

Nastavte tieto premenné prostredia v Vercel Dashboard (alebo lokálne v `.env.local`):

#### `NEXT_PUBLIC_ACCESS_MODE`
- **Hodnoty:** `public` | `restricted`
- **Predvolené:** `public`
- **Popis:** Režim prístupu k aplikácii
- **DÔLEŽITÉ:** Musí mať prefix `NEXT_PUBLIC_` pre middleware kompatibilitu

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
NEXT_PUBLIC_ACCESS_MODE=restricted
ALLOWED_DOMAINS=mojadomena.sk,app.mojadomena.sk,ottie.site
ALLOWED_IPS=
```

### Príklad 2: Obmedzenie len na vašu IP adresu

```bash
NEXT_PUBLIC_ACCESS_MODE=restricted
ALLOWED_DOMAINS=
ALLOWED_IPS=123.45.67.89
```

### Príklad 3: Kombinácia domény a IP

```bash
NEXT_PUBLIC_ACCESS_MODE=restricted
ALLOWED_DOMAINS=mojadomena.sk,ottie.site
ALLOWED_IPS=123.45.67.89,98.76.54.32
```

**Poznámka:** Ak je `NEXT_PUBLIC_ACCESS_MODE=restricted` a obe zoznamy (`ALLOWED_DOMAINS` a `ALLOWED_IPS`) sú prázdne, prístup bude **zamietnutý** pre všetkých (okrem localhost).

## Ako zistiť vašu IP adresu

**Metóda 1: Použite náš API endpoint** (odporúčaná)
1. Otvorte vo svojom prehliadači: `https://vasa-domena.vercel.app/api/my-ip`
2. Skopírujte hodnotu z `clientIp` poľa
3. Použite túto IP adresu v `ALLOWED_IPS`

**Metóda 2: Použite externý web**
1. Prejdite na: https://whatismyipaddress.com/
2. Skopírujte vašu IPv4 adresu
3. Použite túto IP adresu v `ALLOWED_IPS`

**Poznámka:** Ak pracujete z domu a máte dynamickú IP adresu (mení sa), musíte túto IP adresu aktualizovať vždy, keď sa zmení. V takom prípade je lepšie použiť `ALLOWED_DOMAINS` namiesto `ALLOWED_IPS`.

## Nastavenie v Vercel

1. Prejdite do Vercel Dashboard → Váš projekt → Settings → Environment Variables
2. Pridajte premenné:
   - `NEXT_PUBLIC_ACCESS_MODE` = `restricted` (pre obmedzený prístup)
   - `ALLOWED_IPS` = `123.45.67.89` (vaša IP z kroku vyššie)
   - Voliteľne: `ALLOWED_DOMAINS` = `ottie.site,ottie.com,app.ottie.com`
3. Uložte zmeny
4. Vercel automaticky redeploy-ne aplikáciu (trvá ~2 minúty)

**DÔLEŽITÉ:** Nepoužívajte `env` pole v `vercel.json` - je deprecated. Vždy nastavujte environment variables cez Vercel Dashboard alebo CLI.

## Prepínanie medzi režimami

### Zapnúť obmedzený prístup:
```bash
NEXT_PUBLIC_ACCESS_MODE=restricted
ALLOWED_DOMAINS=ottie.site,ottie.com
```

### Vypnúť obmedzený prístup (verejný prístup):
```bash
NEXT_PUBLIC_ACCESS_MODE=public
```

## Ako to funguje

1. Middleware kontroluje `NEXT_PUBLIC_ACCESS_MODE` na začiatku každého requestu
2. **Statické súbory** (favicon, obrázky) a API routes sú vždy povolené (preskočia access control)
3. Ak je `public`, všetky requesty sú povolené
4. Ak je `restricted`, kontroluje sa:
   - Hostname (doména) proti `ALLOWED_DOMAINS`
   - IP adresa proti `ALLOWED_IPS`
5. Ak žiadna kontrola neprejde, vráti sa HTTP 403 Forbidden

## Debugging - Zistiť prečo vás to nepúšťa

Ak dostávate 403 error aj po nastavení IP adresy:

1. **Skontrolujte logy v Vercel:**
   - Vercel Dashboard → Your Project → Functions/Logs
   - Hľadajte `[ACCESS CONTROL]` logy
   - Nájdete tam `Client IP:` a `Allowed IPs:` pre porovnanie

2. **Použite `/api/my-ip` endpoint:**
   - Otvorte `https://vasa-domena.vercel.app/api/my-ip`
   - Skontrolujte `clientIp` a `isYourIpAllowed`
   - Ak je `isYourIpAllowed: false`, IP adresa nie je v `ALLOWED_IPS`

3. **Skontrolujte environment variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Uistite sa, že `ALLOWED_IPS` obsahuje vašu IP adresu
   - Skontrolujte, že premenné sú nastavené pre správne environments (Production/Preview)

4. **IPv4 vs IPv6:**
   - Vercel používa IPv4 adresy
   - Ak máte IPv6 adresu (napr. `2001:0db8:...`), použite jej IPv4 ekvivalent
   - Alebo použite `ALLOWED_DOMAINS` namiesto `ALLOWED_IPS`

## Poznámky

- **Statické súbory** (.ico, .png, .jpg, .svg atď.) sú vždy prístupné bez access control
- **API routes** (`/api/*`) sú vždy prístupné bez access control
- IP adresa sa získava z `x-forwarded-for` alebo `x-real-ip` headrov (Vercel automaticky nastavuje)
- Subdomény sa automaticky kontrolujú (napr. `app.example.com` je povolené, ak je `example.com` v zozname)
- `www.` prefix sa automaticky ignoruje pri kontrole
- Lokálny vývoj (`localhost`) je vždy povolený, aj keď je `NEXT_PUBLIC_ACCESS_MODE=restricted`
- Ak plánujete používať ottie.site subdomény, **musíte** pridať `ottie.site` do `ALLOWED_DOMAINS`
- V development mode, 403 response obsahuje `debug` objekt s detailmi o IP adrese a allowed lists

