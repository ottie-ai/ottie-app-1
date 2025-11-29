# Supabase Setup Guide

## API Keys Configuration

Supabase používa dva typy API keys:

### 1. **Publishable Key** (nový názov)
- **Názov v kóde:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Použitie:** Client-side a Server-side (s RLS policies)
- **Bezpečnosť:** Bezpečné zverejniť (je v klientskom kóde)
- **Kde nájsť:** Supabase Dashboard → Settings → API → Publishable key

### 2. **Secret Key** (nový názov)
- **Názov v kóde:** `SUPABASE_SECRET_KEY` (ak by ste ho potrebovali)
- **Použitie:** Len pre admin operácie, Edge Functions
- **Bezpečnosť:** NIKDY nezverejňovať! Obchádza RLS policies
- **Kde nájsť:** Supabase Dashboard → Settings → API → Secret key

### 3. **Legacy Keys** (stále fungujú)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - starý názov pre publishable key
- `SUPABASE_SERVICE_ROLE_KEY` - starý názov pre secret key

## Environment Variables

Vytvorte súbor `.env.local` v root priečinku:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Nový názov (odporúčané)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Alebo starý názov (stále funguje)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret key - POUŽITE LEN AK SKUTOČNE POTREBUJETE ADMIN PRÁVA
# NIKDY ho nedávajte do NEXT_PUBLIC_ premenných!
# SUPABASE_SECRET_KEY=sb_secret_...
```

## Dôležité poznámky

1. **Pre normálne použitie v aplikácii používame Publishable key** - na client-side aj server-side
2. **Secret key používajte LEN pre admin operácie** - obchádza RLS policies
3. **Kód podporuje oba názvy** - nový (`PUBLISHABLE_KEY`) aj starý (`ANON_KEY`)
4. **Vždy používajte RLS policies** - Secret key ich obchádza, takže buďte opatrní

## Kde nájsť keys v Supabase Dashboard

1. Prejdite do Supabase Dashboard
2. Vyberte svoj projekt
3. Settings → API
4. Nájdete tam:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** → `SUPABASE_SECRET_KEY` (ak potrebujete)

## Google OAuth Setup

1. Supabase Dashboard → Authentication → Providers → Google
2. Zapnite Google provider
3. Pridajte Client ID a Client Secret z Google Cloud Console
4. V Authentication → URL Configuration pridajte redirect URLs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

