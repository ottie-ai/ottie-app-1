# 🔒 Quick Setup Guide - Restricted Mode (IP-based Access)

Tento guide vám pomôže nastaviť IP-based access control pre Ottie app.

## ⚡️ Quick Setup (5 minút)

### Krok 1: Zistiť vašu IP adresu

Otvorte vo vašom prehliadači:
```
https://ottie-app-1.vercel.app/api/my-ip
```

Skopírujte hodnotu z `clientIp` poľa (napr. `123.45.67.89`)

### Krok 2: Nastaviť Environment Variables v Vercel

1. Otvorte [Vercel Dashboard](https://vercel.com/dashboard)
2. Vyberte váš projekt → **Settings** → **Environment Variables**
3. Pridajte tieto 2 premenné:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `NEXT_PUBLIC_ACCESS_MODE` | `restricted` | Production, Preview, Development |
| `ALLOWED_IPS` | `123.45.67.89` (vaša IP) | Production, Preview, Development |

4. Kliknite **Save**
5. Počkajte ~2 minúty na redeploy

### Krok 3: Overiť, že to funguje

Otvorte váš Vercel deployment URL. Ak vidíte aplikáciu → **funguje!** ✅

Ak dostanete 403 error → prejdite na **Troubleshooting** nižšie.

---

## 🛠 Troubleshooting

### 403 Error - "Access denied"

**Možné príčiny:**

1. **IP adresa nie je správna**
   - Otvorte `/api/my-ip` a skontrolujte `isYourIpAllowed`
   - Ak je `false`, vaša IP nie je v `ALLOWED_IPS`
   - Skopírujte IP z `clientIp` a aktualizujte `ALLOWED_IPS` v Vercel

2. **Environment variables nie sú nastavené**
   - Skontrolujte Vercel Dashboard → Settings → Environment Variables
   - Uistite sa, že `NEXT_PUBLIC_ACCESS_MODE` a `ALLOWED_IPS` sú nastavené
   - Uistite sa, že sú nastavené pre správne environments (Production/Preview)

3. **Redeploy ešte neprešiel**
   - Po zmene environment variables musíte počkať na redeploy
   - Skontrolujte Vercel Dashboard → Deployments
   - Počkajte, kým nový deployment má status "Ready"

4. **Dynamická IP adresa sa zmenila**
   - Ak pracujete z domu, vaša IP sa môže meniť
   - Znova otvorte `/api/my-ip` a skontrolujte aktuálnu IP
   - Ak sa zmenila, aktualizujte `ALLOWED_IPS`

### Logy v Vercel

Ak problém pretrváva, skontrolujte logy:

1. Vercel Dashboard → Váš projekt → **Functions** (alebo **Logs**)
2. Hľadajte `[ACCESS CONTROL]` logy
3. Nájdete tam:
   - `Client IP:` - IP adresa, ktorú middleware vidí
   - `Allowed IPs:` - zoznam povolených IP adries
   - `Allowing access` alebo `Denying access`

---

## 🔄 Pridať viac IP adries

Ak potrebujete povoliť prístup pre viacero ľudí (napr. celý tím):

1. Zistite IP adresy všetkých členov tímu (každý nech otvorí `/api/my-ip`)
2. Vercel Dashboard → Settings → Environment Variables
3. Upravte `ALLOWED_IPS`:
   ```
   123.45.67.89,98.76.54.32,111.222.333.444
   ```
   (IP adresy oddelené čiarkou, **bez medzier**)
4. Save a počkajte na redeploy

---

## 🌍 Prepnúť na verejný prístup

Keď ste pripravení spustiť aplikáciu live pre všetkých:

1. Vercel Dashboard → Settings → Environment Variables
2. Upravte `NEXT_PUBLIC_ACCESS_MODE`:
   - **Hodnota:** `public`
3. Save a počkajte na redeploy

**Poznámka:** `ALLOWED_IPS` môžete ponechať - nebude sa používať v public mode.

---

## 📝 Poznámky

- **API endpoint `/api/my-ip` funguje aj v restricted mode** - nikdy nie je blokovaný
- **Statické súbory** (favicon, obrázky) sú vždy dostupné
- **Localhost** je vždy povolený (pre lokálny vývoj)
- Ak máte **dynamickú IP** (mení sa), zvážte použitie `ALLOWED_DOMAINS` namiesto `ALLOWED_IPS` (viď [ACCESS_CONTROL.md](./ACCESS_CONTROL.md))

---

## 🆘 Stále máte problém?

1. Skontrolujte [ACCESS_CONTROL.md](./ACCESS_CONTROL.md) pre detailnú dokumentáciu
2. Skontrolujte Vercel logy (hľadajte `[ACCESS CONTROL]`)
3. Otvorte `/api/my-ip` a skontrolujte debug info
4. Uistite sa, že environment variables sú nastavené pre správne environments

---

## ✅ Checklist

- [ ] Zistil som moju IP adresu cez `/api/my-ip`
- [ ] Nastavil som `NEXT_PUBLIC_ACCESS_MODE=restricted` v Vercel
- [ ] Nastavil som `ALLOWED_IPS` s mojou IP adresou v Vercel
- [ ] Environment variables sú nastavené pre Production, Preview a Development
- [ ] Počkal som 2-3 minúty na redeploy
- [ ] Overil som, že deployment je "Ready" v Vercel Dashboard
- [ ] Aplikácia funguje ✅

