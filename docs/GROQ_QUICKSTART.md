# Groq Quick Start Guide

Rýchly sprievodca pridaním Groq providera pre rýchlejšie generovanie JSON konfigov.

## ⚡ 3-Minute Setup

### 1. Získajte Groq API Key (1 min)

```bash
# Navštívte:
https://console.groq.com/

# Vytvorte account a získajte API key (začína s 'gsk_')
```

### 2. Pridajte do .env.local (1 min)

```bash
# Pridajte tieto 2 riadky:
GROQ_API_KEY=gsk_your_api_key_here
CALL1_AI_PROVIDER=groq
```

### 3. Reštartujte Server (1 min)

```bash
# Stop (Ctrl+C) and restart:
npm run dev
```

## ✅ Hotovo!

Vaša aplikácia teraz používa Groq pre Call 1 (JSON generovanie).

### Overenie

Spustite scrape a sledujte console - mali by ste vidieť:
```
🤖 [Groq] Generating structured JSON...
✅ [Groq] Generated JSON (2000ms)
```

## 🔄 Prepínanie Späť

Ak chcete prepnúť späť na OpenAI:

```bash
# V .env.local zmeňte:
CALL1_AI_PROVIDER=openai
```

## 📊 Porovnanie

| | OpenAI | Groq |
|---|---|---|
| **Rýchlosť** | ~10s | ~2s ⚡ |
| **Cena** | $$$ | $ 💰 |
| **Kvalita** | 9/10 | 8/10 |

## 🎯 Kedy Použiť Čo?

**Groq (Llama-3.1-8b-instant)**
- ✅ Development (rýchly feedback)
- ✅ High volume (náklady)
- ✅ Rýchlosť > kvalita

**OpenAI (GPT-4o-mini)**
- ✅ Production (najlepšia kvalita)
- ✅ Komplexné prompty
- ✅ Kvalita > rýchlosť

## 🆘 Troubleshooting

### "GROQ_API_KEY is not configured"
→ Pridajte `GROQ_API_KEY` do `.env.local`

### "Rate limit exceeded"
→ Groq free tier má limity, počkajte alebo prepnite na OpenAI

### Zlá kvalita výsledkov
→ Prepnite na OpenAI: `CALL1_AI_PROVIDER=openai`

## 📚 Ďalšie Zdroje

- **Detailná konfigurácia**: [AI_PROVIDERS.md](./AI_PROVIDERS.md)
- **Migration guide**: [MIGRATION_TO_GROQ.md](./MIGRATION_TO_GROQ.md)
- **Changelog**: [CHANGELOG_GROQ.md](./CHANGELOG_GROQ.md)
- **Testing utilities**: `lib/openai/test-provider.ts`

## 💡 Pro Tip

Môžete mať oba API keys nakonfigurované a prepínať medzi nimi podľa potreby:

```bash
# V .env.local:
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk-...

# Prepínajte podľa potreby:
CALL1_AI_PROVIDER=groq  # Pre development
# alebo
CALL1_AI_PROVIDER=openai  # Pre production
```

---

**Potrebujete pomoc?** 
- Prečítajte si [AI_PROVIDERS.md](./AI_PROVIDERS.md)
- Skontrolujte console logs
- Testujte s `lib/openai/test-provider.ts`
