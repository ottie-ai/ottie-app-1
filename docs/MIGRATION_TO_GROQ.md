# Migration Guide: Adding Groq Support

Tento guide vás prevedie procesom pridania Groq providera pre Call 1 (JSON generovanie).

## Krok 1: Získajte Groq API Key

1. Navštívte [Groq Console](https://console.groq.com/)
2. Zaregistrujte sa alebo prihláste
3. Vytvorte nový API key
4. Skopírujte API key (začína s `gsk_...`)

## Krok 2: Pridajte Environment Premenné

Otvorte váš `.env.local` súbor a pridajte:

```bash
# Groq Configuration
GROQ_API_KEY=gsk_your_api_key_here

# Switch Call 1 to use Groq
CALL1_AI_PROVIDER=groq
```

**Dôležité**: Stále potrebujete `OPENAI_API_KEY` pre Call 2!

```bash
# OpenAI is still required for Call 2
OPENAI_API_KEY=sk_your_openai_api_key_here
```

## Krok 3: Reštartujte Development Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## Krok 4: Testovanie

1. Navštívte homepage a skúste "Generate Free Site"
2. Zadajte URL real estate listingu
3. Sledujte console logs - mali by ste vidieť:
   ```
   🤖 [Groq] Generating structured JSON...
   🤖 [Groq] Model: llama-3.1-8b-instant
   ✅ [Groq] Generated JSON (XXXms)
   ```

## Prepínanie Späť na OpenAI

Ak chcete prepnúť späť na OpenAI pre Call 1:

```bash
# V .env.local zmeňte:
CALL1_AI_PROVIDER=openai

# Alebo odstráňte riadok (default je openai):
# CALL1_AI_PROVIDER=
```

## Porovnanie Výkonu

### OpenAI (GPT-4o-mini)
- **Rýchlosť**: ~5-15 sekúnd pre Call 1
- **Cena**: ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens
- **Kvalita**: Vynikajúca, veľmi konzistentná

### Groq (Llama-3.1-8b-instant)
- **Rýchlosť**: ~1-3 sekundy pre Call 1 (10x rýchlejšie!)
- **Cena**: Bezplatné (s rate limitmi) alebo ~$0.05 / 1M tokens
- **Kvalita**: Veľmi dobrá pre štruktúrovanie dát

## Časté Problémy

### Chyba: "GROQ_API_KEY is not configured"

**Riešenie**: 
1. Skontrolujte, či máte `GROQ_API_KEY` v `.env.local`
2. Skontrolujte, či ste reštartovali dev server
3. Skontrolujte, či API key je správny

### Chyba: "Groq API rate limit exceeded"

**Riešenie**:
1. Groq má free tier s rate limitmi
2. Prepnite dočasne späť na OpenAI: `CALL1_AI_PROVIDER=openai`
3. Alebo počkajte pár minút a skúste znova

### Zlá kvalita výsledkov s Groq

**Riešenie**:
1. Groq/Llama môže byť menej konzistentný než GPT-4o-mini
2. Pre production, testujte oba providery a vyberte podľa kvality
3. Môžete upraviť prompt v `lib/openai/main-prompt.ts` pre lepšie výsledky s Llama

## Odporúčania

### Development
✅ Použite Groq - rýchlejší vývoj, okamžitý feedback

### Production
⚠️ Testujte oba providery na vašich dátach  
✅ Vyberte podľa kvality výsledkov  
💡 Môžete používať Groq pre väčšinu prípadov a fallback na OpenAI pri zlyhaniach

### High Volume
✅ Groq je ekonomickejší  
✅ 10x rýchlejší = lepší UX  
⚠️ Sledujte rate limity

## Ďalšie Kroky

1. Prečítajte si [AI Providers Documentation](./AI_PROVIDERS.md) pre detaily
2. Sledujte logy pre porovnanie výkonu
3. Otestujte na vašich reálnych property listingoch
4. Upravte `CALL1_AI_PROVIDER` podľa vašich potrieb
