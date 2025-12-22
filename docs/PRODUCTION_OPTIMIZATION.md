# Production Optimization Guide

## Overview

The entire site builder is optimized for production to ensure that only the necessary code and CSS are bundled for each published site. This document explains how the optimization works for ALL components - sections, cursors, page settings, and more.

## ⚠️ MANDATORY: Development Guidelines

**Every new section, page setting, or feature MUST follow these optimization patterns from the start.**

### Rules for New Development

1. **NEVER bundle unused code** - If a feature is optional (like cursor style), create separate components for each option
2. **Use dynamic imports** - All section components must be in the dynamic registry
3. **Conditional rendering** - Features disabled by user should render `null`, not hidden elements
4. **No inline style objects for optional features** - They can't be tree-shaken
5. **Test bundle size** - Before merging, verify that disabled features don't add to bundle

## Architecture

### Section Registry (Dynamic)

All sections are loaded dynamically to ensure code-splitting:

```
components/templates/
├── dynamic-registry.ts           # Dynamic import registry
├── DynamicSectionRenderer.tsx    # Production renderer with lazy loading
├── registry.ts                   # Static registry (for builder/admin only)
├── SectionRenderer.tsx           # Static renderer (for builder/admin only)
├── hero/
│   ├── HeroFull.tsx
│   └── HeroRibbon.tsx
├── features/
│   ├── FeaturesGrid.tsx
│   ├── FeaturesList.tsx
│   └── FeaturesMinimal.tsx
├── gallery/
│   └── GalleryGrid.tsx
├── highlights/
│   ├── HighlightsCards.tsx
│   ├── HighlightsSimple.tsx
│   └── HighlightsTimeline.tsx
├── agent/
│   └── AgentCard.tsx
└── contact/
    └── ContactSimple.tsx
```

### Cursor Component Structure

```
components/shared/
├── frosty-cursor.tsx      # Frosty style (blur background, scaling)
├── circle-cursor.tsx      # Circle style (animated border)
├── section-cursor.tsx     # Smart wrapper with dynamic imports
├── cursor-manager.ts      # Shared cursor manager (singleton)
└── index.ts               # Exports
```

### How It Works

1. **Separate Components**: Cursor styles are split into separate components:
   - `FrostyCursor` - Frosty style only
   - `CircleCursor` - Circle style only

2. **Dynamic Imports**: `SectionCursor` uses Next.js `dynamic()` to lazy-load cursors:
   ```tsx
   const FrostyCursor = dynamic(() => import('./frosty-cursor').then(mod => ({ default: mod.FrostyCursor })), {
     ssr: false,
   })
   ```

3. **Conditional Rendering**: Based on `theme.cursorStyle`:
   - `'none'` → No cursor code bundled
   - `'frosty'` → Only FrostyCursor bundled
   - `'circle'` → Only CircleCursor bundled

4. **Tree Shaking**: Next.js automatically removes unused code during build:
   - If site uses `cursorStyle: 'none'` → No cursor code in bundle
   - If site uses `cursorStyle: 'frosty'` → Only frosty cursor in bundle
   - If site uses `cursorStyle: 'circle'` → Only circle cursor in bundle

## Usage in Sections

### Hero Section Example

```tsx
import { SectionCursor } from '@/components/shared/section-cursor'

export function HeroRibbon({ data, theme, colorScheme }: SectionComponentProps<HeroSectionData>) {
  return (
    <section data-cursor-target>
      <SectionCursor 
        targetSelector="[data-cursor-target]"
        theme={theme}
        icon="play"
      />
      {/* ... section content ... */}
    </section>
  )
}
```

### Gallery Section Example

```tsx
import { SectionCursor } from '@/components/shared/section-cursor'

export function GalleryGrid({ data, theme, colorScheme }: SectionComponentProps<GallerySectionData>) {
  return (
    <section>
      <SectionCursor 
        targetSelector="[data-gallery-image]"
        theme={theme}
        icon="arrow"
      />
      {/* ... gallery items ... */}
    </section>
  )
}
```

## Cursor Styles

### None (`cursorStyle: 'none'`)
- **Behavior**: No custom cursor
- **Bundle Size**: 0 KB (no cursor code)
- **Use Case**: Sites that don't want custom cursors

### Frosty (`cursorStyle: 'frosty'`)
- **Behavior**: Blur background, scales up on hover
- **Default Icon**: Play icon
- **Bundle Size**: ~3 KB (frosty cursor + cursor manager)
- **Use Case**: Video sections, interactive elements

### Circle (`cursorStyle: 'circle'`)
- **Behavior**: Animated border draws clockwise
- **Default Icon**: Arrow (↗) icon
- **Bundle Size**: ~3.5 KB (circle cursor + cursor manager)
- **Use Case**: Gallery, links, navigation

## Performance Benefits

### Before Optimization
- All cursor code bundled: ~8 KB
- Unused cursor styles included
- Unused CSS loaded

### After Optimization
- Only selected cursor bundled: 0-3.5 KB
- 100% reduction if `cursorStyle: 'none'`
- 40-60% reduction if using single style
- No unused CSS

## Page Settings

Users can select cursor style in Page Settings:

1. Open site in builder
2. Click "Page Settings" in settings panel
3. Select "Cursor Style":
   - **None**: No custom cursor
   - **Frosty**: Blur background style
   - **Circle**: Animated border style

## Technical Details

### Dynamic Import Benefits

```tsx
// ✅ GOOD: Dynamic import (tree-shakable)
const FrostyCursor = dynamic(() => import('./frosty-cursor'))

// ❌ BAD: Static import (always bundled)
import { FrostyCursor } from './frosty-cursor'
```

### Next.js Build Optimization

Next.js automatically:
1. Code-splits dynamic imports into separate chunks
2. Only loads needed chunks on client
3. Removes dead code during production build
4. Minimizes and compresses chunks

### Shared Dependencies

`cursor-manager.ts` is shared between both cursor styles:
- Single instance (singleton)
- Manages mouse movement
- Handles hover states
- ~1 KB gzipped

Only loaded if cursor is used (not loaded for `cursorStyle: 'none'`).

## Verifying Optimization

### Check Bundle Size

```bash
# Build for production
npm run build

# Check .next/static/chunks for cursor files
ls -lh .next/static/chunks/*cursor*
```

### Check Network Tab

1. Open published site
2. Open DevTools Network tab
3. Filter by "cursor"
4. Verify only needed cursor chunk loads

### Example Results

**Site with `cursorStyle: 'none'`:**
- No cursor chunks in network tab
- 0 KB cursor code

**Site with `cursorStyle: 'frosty'`:**
- `frosty-cursor.js` chunk loaded (~3 KB)
- No circle cursor code

**Site with `cursorStyle: 'circle'`:**
- `circle-cursor.js` chunk loaded (~3.5 KB)
- No frosty cursor code

## Best Practices

1. **Always use `SectionCursor`** in template sections (not direct imports)
2. **Specify icon** for each section (defaults: 'play' for frosty, 'arrow' for circle)
3. **Test in production** to verify bundle optimization
4. **Monitor bundle size** after changes

## Migration Guide

If you have existing sections using old cursor components:

```tsx
// Old (not optimized)
import { PlayCursor } from '@/components/shared/play-cursor'

<PlayCursor targetSelector="..." />
```

```tsx
// New (optimized)
import { SectionCursor } from '@/components/shared/section-cursor'

<SectionCursor 
  targetSelector="..." 
  theme={theme}
  icon="play"
/>
```

## Future Improvements

Potential optimizations:
1. **Lazy load cursor manager** only when needed
2. **Preload cursor chunk** on hover intent
3. **Shared cursor instance** across multiple sections
4. **CSS-only cursor** option for even smaller bundle

---

## Section Dynamic Loading

### How It Works

All sections in `dynamic-registry.ts` use lazy loading:

```typescript
// dynamic-registry.ts
export const dynamicRegistry = {
  hero: {
    full: () => import('./hero/HeroFull').then(mod => ({ default: mod.HeroFull })),
    ribbon: () => import('./hero/HeroRibbon').then(mod => ({ default: mod.HeroRibbon })),
  },
  // ... more sections
}
```

### Which Renderer to Use

| Context | Use | Why |
|---------|-----|-----|
| Published site (public) | `DynamicSectionRenderer` | Code-splitting, optimal bundle |
| Builder (admin) | `SectionRenderer` | Faster editing, all components loaded |
| Preview (admin) | `SectionRenderer` | Consistent with builder |

### Adding a New Section

1. Create the component in `components/templates/{type}/{VariantName}.tsx`
2. Add to BOTH registries:

```typescript
// registry.ts (static - for builder)
import { NewSection } from './type/NewSection'
export const componentRegistry = {
  type: {
    variant: NewSection,
  },
}

// dynamic-registry.ts (dynamic - for published sites)
export const dynamicRegistry = {
  type: {
    variant: () => import('./type/NewSection').then(mod => ({ default: mod.NewSection })),
  },
}
```

---

## Page Settings Optimization

### Conditional Rendering Pattern

All page settings that enable/disable features must use conditional rendering:

```tsx
// ✅ GOOD: Conditional rendering
{ctaType !== 'none' && ctaValue && (
  <FloatingCTAButton type={ctaType} value={ctaValue} />
)}

// ❌ BAD: Always rendering (CSS hidden)
<FloatingCTAButton 
  type={ctaType} 
  value={ctaValue}
  style={{ display: ctaType === 'none' ? 'none' : 'block' }}
/>
```

### Current Page Settings

| Setting | Values | Optimization |
|---------|--------|--------------|
| `cursorStyle` | none, frosty, circle | Dynamic import of cursor type |
| `ctaType` | none, whatsapp, phone, email | Conditional render of CTA button |
| `animationStyle` | blur, fade-in, slide-up, none | Conditional animation classes |
| `loaderType` | circle, none | Conditional loader component |

### Adding a New Page Setting

1. Add to `ThemeConfig` in `types/builder.ts`:
```typescript
export interface ThemeConfig {
  // ... existing
  newSetting?: 'option1' | 'option2' | 'none'
}
```

2. Add UI in `PageSettings.tsx`:
```tsx
<Field>
  <FieldLabel>New Setting</FieldLabel>
  <Select 
    value={safeTheme.newSetting || 'none'}
    onValueChange={(value) => onThemeChange({ ...safeTheme, newSetting: value })}
  >
    <SelectContent>
      <SelectItem value="none">None</SelectItem>
      <SelectItem value="option1">Option 1</SelectItem>
      <SelectItem value="option2">Option 2</SelectItem>
    </SelectContent>
  </Select>
</Field>
```

3. **IMPORTANT**: If the setting controls a feature, use conditional rendering:
```tsx
// In the section or page component
{theme.newSetting !== 'none' && (
  <NewFeatureComponent setting={theme.newSetting} />
)}
```

4. **If the feature has multiple styles**, create separate components with dynamic imports (like cursors)

---

## Complete Example: Adding a New Section Variant

Let's say you want to add a new hero variant called "HeroMinimal":

### Step 1: Create the Component

```tsx
// components/templates/hero/HeroMinimal.tsx
'use client'

import { SectionComponentProps, HeroSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { getSectionColors } from '@/lib/section-colors'
import { SectionCursor } from '@/components/shared/section-cursor'

export function HeroMinimal({ data, theme, colorScheme = 'light' }: SectionComponentProps<HeroSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const colors = getSectionColors(colorScheme, theme)
  
  return (
    <section data-cursor-target className="h-screen flex items-center justify-center">
      {/* Cursor - uses theme.cursorStyle automatically */}
      <SectionCursor 
        targetSelector="[data-cursor-target]"
        theme={theme}
        icon="play"
      />
      
      <h1 style={{ fontFamily: headingFont, color: colors.textColor }}>
        {data.headline}
      </h1>
    </section>
  )
}
```

### Step 2: Register in BOTH Registries

```typescript
// registry.ts (static - for builder/admin)
import { HeroMinimal } from './hero/HeroMinimal'

export const componentRegistry = {
  hero: {
    full: HeroFull,
    ribbon: HeroRibbon,
    minimal: HeroMinimal,  // ← Add here
  },
  // ...
}

// dynamic-registry.ts (dynamic - for published sites)
export const dynamicRegistry = {
  hero: {
    full: () => import('./hero/HeroFull').then(mod => ({ default: mod.HeroFull })),
    ribbon: () => import('./hero/HeroRibbon').then(mod => ({ default: mod.HeroRibbon })),
    minimal: () => import('./hero/HeroMinimal').then(mod => ({ default: mod.HeroMinimal })),  // ← Add here
  },
  // ...
}
```

### Step 3: Update Types (if needed)

```typescript
// types/builder.ts
export interface SectionVariants {
  hero: 'full' | 'ribbon' | 'minimal'  // ← Add 'minimal'
  // ...
}
```

### Result

- Published sites using `HeroMinimal` will ONLY load `HeroMinimal` code
- Sites NOT using `HeroMinimal` will have 0 KB of its code
- Admin/builder loads all variants for fast switching

---

## Complete Example: Adding Section-Level Settings

Let's say you want to add a "showOverlay" setting to hero sections:

### Step 1: Update Section Data Type

```typescript
// types/builder.ts
export interface HeroSectionData extends SectionData {
  headline: string
  subheadline?: string
  // ...existing fields
  showOverlay?: boolean  // ← New setting
  overlayOpacity?: number  // ← New setting
}
```

### Step 2: Add UI in Settings Panel

```tsx
// components/builder/settings/HeroSettings.tsx (or wherever hero settings are)
<Field>
  <FieldLabel>Show Overlay</FieldLabel>
  <Switch
    checked={data.showOverlay ?? false}
    onCheckedChange={(checked) => onDataChange({ ...data, showOverlay: checked })}
  />
</Field>

{data.showOverlay && (
  <Field>
    <FieldLabel>Overlay Opacity</FieldLabel>
    <Slider
      value={[data.overlayOpacity ?? 50]}
      onValueChange={([value]) => onDataChange({ ...data, overlayOpacity: value })}
      min={0}
      max={100}
    />
  </Field>
)}
```

### Step 3: Use Conditionally in Section

```tsx
// components/templates/hero/HeroRibbon.tsx
export function HeroRibbon({ data, theme, colorScheme }: SectionComponentProps<HeroSectionData>) {
  return (
    <section>
      {/* Background */}
      <div className="absolute inset-0">
        <Image src={data.propertyImage} ... />
        
        {/* Overlay - ONLY rendered if enabled */}
        {data.showOverlay && (
          <div 
            className="absolute inset-0 bg-black"
            style={{ opacity: (data.overlayOpacity ?? 50) / 100 }}
          />
        )}
      </div>
      {/* ... rest of section */}
    </section>
  )
}
```

### Key Points

- Setting UI only shows opacity slider when `showOverlay` is true
- Section only renders overlay div when `showOverlay` is true
- No hidden elements, no unused CSS

---

## Checklist for Production Readiness

Before any feature goes to production, verify:

- [ ] **Disabled features render null** - Not hidden with CSS
- [ ] **Dynamic imports used** - For optional heavy components
- [ ] **Separate components for variants** - Can be tree-shaken
- [ ] **No inline styles for conditionals** - Use conditional rendering
- [ ] **Bundle size tested** - Run `npm run build` and check chunks
- [ ] **No admin code in public bundle** - Published sites don't import admin components

---

## Summary

The production optimization ensures that published sites only include the code they actually use:

- ✅ Dynamic section loading (only used sections bundled)
- ✅ Conditional cursor rendering (no unused cursor code)
- ✅ Conditional CTA button (no code if disabled)
- ✅ Conditional animations (no unused animation code)
- ✅ Smaller bundle size per page
- ✅ Faster page load
- ✅ Better Core Web Vitals
- ✅ Tree-shaking friendly

Users can freely change any setting in Page Settings without worrying about bundle bloat.
