# AI Providers Configuration

Ottie podporuje viacero AI providerov pre generovanie konfigurácie real estate portálov.

## Dva AI Cally

Systém používa 2 samostatné AI cally:

### Call 1: JSON Config Generation
- **Účel**: Extrakcia a štruktúrovanie dát z property listingov do JSON formátu
- **Podporované providery**: OpenAI, Groq
- **Konfigurácia**: `CALL1_AI_PROVIDER` environment variable

### Call 2: Title & Highlights Generation
- **Účel**: Generovanie atraktívnych názvov a highlights pre properties
- **Provider**: OpenAI (GPT-4o-mini)
- **Konfigurácia**: Používa vždy OpenAI

## Environment Variables

### Požadované API Kľúče

```bash
# OpenAI (vyžadované pre Call 2)
OPENAI_API_KEY=sk-...

# Groq (voliteľné - len ak chcete použiť Groq pre Call 1)
GROQ_API_KEY=gsk_...
```

### Provider Selection Pre Call 1

```bash
# Možnosti: 'openai' alebo 'groq'
# Default: 'openai'
CALL1_AI_PROVIDER=openai
```

## Podporované Modely

### OpenAI
- **Model**: `gpt-4o-mini`
- **Použitie**: Call 1 (default) + Call 2 (vždy)
- **Features**: JSON schema validation, konzistentné výsledky

### Groq
- **Model**: `llama-3.1-8b-instant`
- **Použitie**: Call 1 (voliteľné)
- **Features**: Rýchlejšie, lacnejšie, dobré pre JSON generovanie

## Prepínanie Medzi Providermi

### Použitie OpenAI pre Call 1 (default)
```bash
CALL1_AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Použitie Groq pre Call 1
```bash
CALL1_AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...  # Stále vyžadované pre Call 2
```

## Výhody Každého Providera

### OpenAI (GPT-4o-mini)
✅ Lepšia podpora pre JSON schema validation  
✅ Konzistentnejšie výsledky  
✅ Lepšie pochopenie komplexných inštrukcií  
⚠️ Pomalšie  
⚠️ Drahšie  

### Groq (Llama-3.1-8b-instant)
✅ Extrémne rýchle (~10x rýchlejšie než GPT-4o-mini)  
✅ Lacnejšie  
✅ Dostatočne dobré pre štruktúrovanie dát  
⚠️ Menej konzistentné pri komplexných inštrukciách  

## Odporúčania

- **Development**: Použite Groq pre Call 1 (rýchlejší vývoj)
- **Production**: Testujte oba providery a vyberte podľa kvality výsledkov
- **High Volume**: Groq je ekonomickejší pre veľké množstvo requestov

## Troubleshooting

### Chyba: "GROQ_API_KEY is not configured"
- Skontrolujte, či máte nastavený `GROQ_API_KEY` v `.env.local`
- Alebo zmeňte `CALL1_AI_PROVIDER=openai`

### Chyba: "OPENAI_API_KEY is not configured"
- OpenAI API key je vždy potrebný (kvôli Call 2)
- Nastavte `OPENAI_API_KEY` v `.env.local`

### Zlá kvalita výsledkov s Groq
- Skúste zmeniť `CALL1_AI_PROVIDER=openai`
- Alebo upravte prompt v `lib/openai/main-prompt.ts`
