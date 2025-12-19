# React Bits Components - Installation Guide

Tento dokument popisuje, ako pridávať nové komponenty z [React Bits](https://reactbits.dev) do projektu Ottie.

## Prehľad

React Bits je knižnica animovaných a interaktívnych React komponentov. Komponenty sa **neinštalujú cez npm**, ale pridávajú sa priamo do projektu pomocou Shadcn CLI.

## Ako pridať nový komponent

### 1. Nájdite komponent na React Bits

Navštívte [reactbits.dev](https://reactbits.dev) a vyhľadajte požadovaný komponent. Každý komponent má svoju stránku s dokumentáciou a príkladmi použitia.

### 2. Inštalácia cez Shadcn CLI

Komponenty z React Bits sa pridávajú pomocou Shadcn CLI s nasledujúcim formátom:

```bash
npx shadcn@latest add https://reactbits.dev/r/ComponentName-LANGUAGE-STYLE
```

**Formát URL:**
- `ComponentName` - Názov komponentu (napr. `CurvedLoop`, `SplitText`, `ClickSpark`)
- `LANGUAGE` - Jazyk: `JS` (JavaScript) alebo `TS` (TypeScript)
- `STYLE` - Štýl: `CSS` alebo `TW` (Tailwind CSS)

**Príklady:**

```bash
# TypeScript + Tailwind (odporúčané pre tento projekt)
npx shadcn@latest add https://reactbits.dev/r/CurvedLoop-TS-TW

# TypeScript + CSS
npx shadcn@latest add https://reactbits.dev/r/SplitText-TS-CSS

# JavaScript + Tailwind
npx shadcn@latest add https://reactbits.dev/r/ClickSpark-JS-TW
```

### 3. Kde sa komponent nainštaluje

Komponenty sa nainštalujú do:
```
components/ComponentName.tsx
```

**Poznámka:** Komponenty sa pridávajú priamo do `components/` priečinka, nie do `components/ui/`.

### 4. Import a použitie

Po inštalácii importujte komponent:

```tsx
// Pre default export
import ComponentName from '@/components/ComponentName'

// Pre named export (ak je to potrebné)
import { ComponentName } from '@/components/ComponentName'
```

## Príklad: CurvedLoop

### Inštalácia

```bash
npx shadcn@latest add https://reactbits.dev/r/CurvedLoop-TS-TW
```

### Použitie

```tsx
import CurvedLoop from '@/components/CurvedLoop'

function MyComponent() {
  return (
    <CurvedLoop
      marqueeText="Your text here"
      speed={1}
      curveAmount={0}
      direction="left"
      interactive={false}
      className="text-white"
    />
  )
}
```

## Konfigurácia projektu

Projekt už má nakonfigurovaný registry pre React Bits v `components.json`:

```json
{
  "registries": {
    "@react-bits": "https://reactbits.dev/r/{name}.json"
  }
}
```

Táto konfigurácia umožňuje Shadcn CLI automaticky rozpoznať React Bits komponenty.

## Dôležité poznámky

1. **TypeScript + Tailwind odporúčané:** Pre tento projekt odporúčame používať `TS-TW` varianty, pretože projekt používa TypeScript a Tailwind CSS.

2. **Lokácia komponentov:** Komponenty sa pridávajú do `components/`, nie do `components/ui/`. Shadcn UI komponenty idú do `components/ui/`, React Bits komponenty do `components/`.

3. **Úprava komponentov:** Po inštalácii môžete komponenty upravovať podľa potreby. Zmeny sa neprepíšu pri budúcich inštaláciách.

4. **Dokumentácia:** Pre detailnú dokumentáciu a príklady použitia navštívte stránku komponentu na [reactbits.dev](https://reactbits.dev).

## Dostupné komponenty

Pre zoznam všetkých dostupných komponentov navštívte:
- [React Bits - Text Animations](https://reactbits.dev/text-animations)
- [React Bits - UI Components](https://reactbits.dev/ui-components)
- [React Bits - All Components](https://reactbits.dev)

## Riešenie problémov

### Chyba: "Unexpected token '<', "<!doctype "... is not valid JSON"

Toto znamená, že URL komponentu nie je správne. Skontrolujte:
- Správny názov komponentu (case-sensitive)
- Správny formát: `ComponentName-LANGUAGE-STYLE`
- Komponent existuje na reactbits.dev

### Komponent sa nainštaloval, ale má chyby

1. Skontrolujte, či máte všetky potrebné závislosti
2. Skontrolujte TypeScript chyby v nainštalovanom komponente
3. Možno je potrebné upraviť import paths alebo className

### Font sa neaplikuje správne

Ak potrebujete aplikovať font na React Bits komponent, môžete:
1. Pridať `style={{ fontFamily: 'inherit' }}` do SVG text elementu v komponente
2. Alebo aplikovať font na wrapper element a použiť `fontFamily: 'inherit'` v komponente

## Príklad úpravy komponentu pre font

Ak potrebujete, aby komponent dedil font z parent elementu:

```tsx
// V komponente (napr. CurvedLoop.tsx)
<text 
  className={className ?? ''} 
  style={{ fontFamily: 'inherit' }}
>
  {/* ... */}
</text>
```

A v parent komponente:

```tsx
<div style={{ fontFamily: headingFont }}>
  <CurvedLoop {...props} />
</div>
```

