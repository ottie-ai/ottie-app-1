# Subdomain Routing Setup

Tento projekt používa subdoménové routovanie pre separáciu marketing webu, aplikácie a klient stránok.

## Štruktúra

- **`ottie.com`** → Marketing web (`app/(marketing)/`)
- **`app.ottie.com`** → Aplikácia (`app/(app)/`)
- **`client.ottie.com`** → Klient stránky (`app/(z-sites)/`)

## Environment Variables

Pridaj do `.env.local`:

```env
NEXT_PUBLIC_ROOT_DOMAIN=ottie.com
```

Pre lokálny development (localhost):
```env
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
```

## DNS Setup (Production)

V Verceli alebo u tvojho DNS poskytovateľa pridaj:

**CNAME záznam:**
- **Type:** CNAME
- **Name:** `app`
- **Value:** `cname.vercel-dns.com` (alebo tvoja Vercel URL)

## Lokálne testovanie

Pre testovanie subdomén lokálne:

1. Uprav `/etc/hosts` (macOS/Linux) alebo `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
127.0.0.1 app.localhost
127.0.0.1 client.localhost
```

2. Prístup cez:
- `http://app.localhost:3000/overview`
- `http://app.localhost:3000/sites`
- `http://app.localhost:3000/settings`
- `http://app.localhost:3000/builder/[id]`
- `http://client.localhost:3000`

## Cookie Sharing

Supabase cookies sú nastavené s `domain: '.ottie.com'` v produkcii, čo umožňuje zdieľanie session medzi subdoménami.

**Dôležité:** Na localhoste to nefunguje s bodkou, preto je to podmienené `process.env.NODE_ENV === 'production'`.

## Route Groups

- `(marketing)` - Marketing web (homepage, privacy, terms)
- `(auth)` - Autentifikácia (login, signup, callback)
- `(app)` - Aplikácia (workspace, builder)
- `(z-sites)` - Klient stránky (dynamické subdomény) - "z-" prefix zabezpečuje nižšiu prioritu ako (app) routes

Route groups (zátvorky) neovplyvňujú URL cestu, len logicky organizujú kód.

