# Apify JSON Cleaners

Tento adresár obsahuje website-specific JSON cleaners pre Apify scrapers.

## Štruktúra

Každý web má svoj vlastný cleaner súbor, ktorý obsahuje logiku na čistenie JSON dát špecifických pre daný web.

### Príklad: Zillow

- **Súbor**: `zillow.ts`
- **Funkcia**: `cleanZillowJson(apifyJson: any): any`
- **Účel**: Odstraňuje nepotrebné polia z Zillow JSON odpovedí a transformuje dáta podľa potreby

## Ako pridať nový web

1. **Vytvorte nový cleaner súbor** v tomto adresári (napr. `redfin.ts`):

```typescript
/**
 * Redfin-specific JSON cleaner
 */
export function cleanRedfinJson(apifyJson: any): any {
  if (!apifyJson) {
    return apifyJson
  }

  // Implementácia Redfin-specific cleaning logiky
  const cleaned: any = { ...apifyJson }
  
  // Odstráňte nepotrebné polia
  delete cleaned.unnecessaryField
  
  // Transformujte dáta podľa potreby
  // ...
  
  return cleaned
}
```

2. **Aktualizujte `apify-scrapers.ts`** a pridajte nový scraper:

```typescript
import { cleanRedfinJson } from './apify-cleaners/redfin'

export const APIFY_SCRAPERS: ApifyScraperConfig[] = [
  // ... existujúce scrapers
  {
    id: 'redfin',
    name: 'Redfin Detail Scraper',
    actorId: 'actor-id~redfin-scraper',
    shouldHandle: (url: string) => {
      try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.toLowerCase()
        return hostname === 'redfin.com' || hostname === 'www.redfin.com'
      } catch {
        return false
      }
    },
    buildInput: (url: string) => {
      return {
        startUrls: [{ url }],
      }
    },
    cleanJson: cleanRedfinJson, // Redfin-specific JSON cleaning
  },
]
```

3. **Hotovo!** Systém automaticky použije Redfin cleaner pri scrapovaní Redfin URL.

## Ako to funguje

1. Keď sa scrapuje URL, systém najprv zistí, ktorý scraper by mal byť použitý (`shouldHandle`)
2. Ak sa nájde scraper, použije sa jeho `cleanJson` funkcia na vyčistenie JSON dát
3. Ak scraper nemá `cleanJson` funkciu, použije sa raw JSON bez čistenia

## Poznámky

- Každý cleaner by mal byť idempotentný (viacnásobné volanie by malo dať rovnaký výsledok)
- Cleaners by mali byť špecifické pre daný web - neodstraňujte polia, ktoré môžu byť užitočné pre iné weby
- Pre komplexné transformácie použite rekurzívne funkcie (pozri `zillow.ts` ako príklad)
