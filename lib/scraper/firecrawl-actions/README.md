# Firecrawl Actions

Tento adresár obsahuje website-specific actions pre Firecrawl scraping. Actions sa používajú len pre weby, ktoré ich potrebujú (napr. kliknutie na button pre zobrazenie všetkých fotiek).

## Štruktúra

Každý web má svoj vlastný action súbor, ktorý definuje akcie, ktoré sa majú vykonať pred scrapovaním.

### Príklad: Realtor.com

- **Súbor**: `realtor.ts`
- **Funkcia**: `getRealtorActions(): FirecrawlAction[]`
- **Účel**: Klikne na "View all listing photos" button, aby sa zobrazili všetky fotky v galérii

## Ako pridať nový web

1. **Vytvorte nový action súbor** v tomto adresári (napr. `zillow.ts`):

```typescript
/**
 * Zillow-specific Firecrawl actions
 */
import type { FirecrawlAction } from './index'

export function getZillowActions(): FirecrawlAction[] {
  return [
    // Wait for page to load
    { type: 'wait', milliseconds: 2000 },
    
    // Click specific button (use universal selector like aria-label)
    {
      type: 'click',
      selector: 'button[aria-label="View all photos"]',
    },
    
    // Wait for content to load
    { type: 'wait', milliseconds: 3000 },
    
    // Scrape the page
    { type: 'scrape' },
  ]
}
```

2. **Aktualizujte `index.ts`** a pridajte nový web:

```typescript
export function getFirecrawlActions(url: string): FirecrawlAction[] | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return require('./realtor').getRealtorActions()
    }
    
    if (hostname === 'zillow.com' || hostname === 'www.zillow.com') {
      return require('./zillow').getZillowActions()
    }
    
    // Return null for websites without specific actions
    return null
  } catch {
    return null
  }
}
```

3. **Hotovo!** Systém automaticky použije actions pri scrapovaní URL pre daný web.

## Ako to funguje

1. Keď sa scrapuje URL cez Firecrawl, systém zistí, či existujú actions pre daný web
2. Ak áno, actions sa pridajú do Firecrawl volania
3. Ak nie (random web bez špecifického processing), používa sa normálne scrapovanie bez actions
4. Actions sa vykonajú pred scrapovaním (napr. kliknutie na button, čakanie, atď.)

## Typy actions

- `wait` - Počkať určitý počet milisekúnd
- `click` - Kliknúť na element (použite CSS selector)
- `write` - Napísať text do inputu
- `press` - Stlačiť kláves
- `scroll` - Scrollovať stránku
- `screenshot` - Urobiť screenshot
- `scrape` - Scrapnúť stránku (obvykle na konci)

## Dôležité poznámky

- **Univerzálne selectory**: Použite `aria-label`, `data-testid`, alebo iné stabilné atribúty. **NEPOUŽÍVAJTE class names**, ktoré sa menia (napr. `sc-91faa944-1`)
- **Čakanie**: Vždy počkajte po kliknutí, aby sa obsah stihol načítať
- **Nie každý web potrebuje actions**: Len weby so špecifickými potrebami (napr. expandovanie galérie)
- **Každý web môže mať iné actions**: Realtor.com kliká na "View all photos", iný web môže robiť niečo úplne iné

## Realtor.com Actions

Realtor.com actions:
1. Počkajú 2 sekundy na načítanie stránky
2. Kliknú na button s `aria-label="View all listing photos"` (univerzálny selector)
3. Počkajú 3 sekundy na expandovanie galérie
4. Scrapnú stránku s expandovanou galériou

Selector `button[aria-label="View all listing photos"]` je univerzálny, pretože `aria-label` sa nemení medzi property pages (na rozdiel od class names).
