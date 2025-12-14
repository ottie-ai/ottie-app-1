# Premium Fonts Implementation

This document describes the implementation of premium self-hosted fonts feature in Ottie.

## Overview

Premium fonts are self-hosted fonts (woff2 format) that are only available to workspaces with `feature_premium_fonts` plan feature enabled. They are managed entirely in code (no database) and loaded dynamically based on user's plan.

## Architecture

### 1. Font Storage

Premium fonts are stored in `/public/fonts/premium/` directory:

```
/public/fonts/premium/
  /Jedira/
    - Jedira-Regular.woff2
    - Jedira-Italic.woff2
  /Pennywise/
    - Prettywise-Thin.woff2
    - Prettywise-ExtraLight.woff2
    - Prettywise-Light.woff2
    - Prettywise-Regular.woff2
    - Prettywise-Medium.woff2
    - Prettywise-SemiBold.woff2
    - Prettywise-Bold.woff2
    - Prettywise-ExtraBold.woff2
    - Prettywise-Heavy.woff2
  /Poria/
    - Poria-Thin.woff2
    - Poria-Light.woff2
    - Poria-Regular.woff2
    - Poria-Medium.woff2
    - Poria-Bold.woff2
    - Poria-ExtraBold.woff2
    - Poria-Black.woff2
```

### 2. Font Configuration (`lib/fonts.ts`)

Premium fonts are defined in the `premiumFonts` array with:
- `isPremium: true` flag
- `fontFiles` array containing font file URLs and metadata

```typescript
export const premiumFonts: FontOption[] = [
  {
    name: 'Jedira',
    value: 'Jedira',
    category: 'luxury',
    weights: [400],
    defaultWeight: 400,
    description: 'Elegant serif with italic support.',
    isPremium: true,
    fontFiles: [
      { weight: 400, style: 'normal', url: '/fonts/premium/Jedira/Jedira-Regular.woff2' },
      { weight: 400, style: 'italic', url: '/fonts/premium/Jedira/Jedira-Italic.woff2' },
    ],
  },
  // ... more premium fonts
]
```

### 3. Access Control

Access to premium fonts is controlled by the `feature_premium_fonts` boolean field in the `plans` table:

1. **Database**: Plans table has `feature_premium_fonts` column
2. **App Context**: `hasPlanFeature(plan, 'feature_premium_fonts')` checks if workspace has access
3. **UI**: `FontSelector` component disables premium fonts for users without access

### 4. Font Loading (`FontLoader` component)

The `FontLoader` component automatically detects font type and loads accordingly:

- **Google Fonts**: Loaded via `<link>` tag from Google Fonts CDN
- **Premium Fonts**: Loaded via `@font-face` CSS rules injected into `<style>` tag
- **Local Fonts** (Canela): Already available, no loading needed

```typescript
// Usage in PreviewSitePage (same for all font types)
const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]
<FontLoader fonts={fonts} />
```

The component:
1. Separates fonts by type (Google vs Premium)
2. Loads Google Fonts via CDN link
3. Generates and injects @font-face rules for premium fonts
4. Works in both builder (direct rendering) and published sites

### 5. Font Selection (`FontSelector` component)

The `FontSelector` component:
1. Shows all fonts (Google + Premium) grouped by category
2. Displays "Premium" badge with crown icon for premium fonts
3. Disables premium fonts if user doesn't have `feature_premium_fonts`
4. Uses `useAppData()` hook to check current workspace plan

```typescript
// Premium fonts appear first in each category
// Disabled if hasPlanFeature('feature_premium_fonts') === false
<FontSelector 
  value={theme.headingFontFamily} 
  onChange={(font) => updateTheme({ headingFontFamily: font })} 
/>
```

## How It Works

### Builder Flow

1. User opens site editor (`/sites/[id]`)
2. `SiteDetailClient` renders `PreviewSitePage` directly (no iframe)
3. `FontSelector` in settings panel checks workspace plan via `hasPlanFeature('feature_premium_fonts')`
4. Premium fonts are shown with badge (enabled/disabled based on plan)
5. When user selects a font (Google or Premium):
   - Font value is saved to `site.config.theme.headingFontFamily`
   - `PreviewSitePage` re-renders with new font (direct rendering, no iframe reload)
6. `FontLoader` in `PreviewSitePage` detects font type and loads accordingly:
   - Premium fonts: injects @font-face rules
   - Google fonts: loads from CDN
   - Local fonts: already available

### Published Site Flow

1. User visits published site (e.g., `https://123-main-st.ottie.site`)
2. Middleware routes request to `(z-sites)/[site]/page.tsx`
3. Server fetches site config from database
4. `SiteContentClient` wraps `PublishedSitePage` with site config
5. `PublishedSitePage` (clean public component) renders the site:
   - Uses `useSiteFonts` hook to load fonts
   - Premium fonts: injected via @font-face CSS rules
   - Google fonts: loaded via CDN `<link>` tag
   - Heading font applied globally via `[data-published-site]` CSS selector
6. Font is applied to all headings (h1-h6) in the site

**Important**: Published sites use `PublishedSitePage` which has NO admin dependencies.
This ensures minimal bundle size and fast loading for public visitors.

## Adding New Premium Fonts

To add a new premium font:

1. **Add font files** to `/public/fonts/premium/{font-name}/`
   - Use woff2 format for best compression
   - Include all needed weights

2. **Add font definition** to `lib/fonts.ts`:
   ```typescript
   {
     name: 'Font Name',
     value: 'Font Name',
     category: 'luxury', // or 'modern', 'corporate', 'lifestyle'
     weights: [400, 700],
     defaultWeight: 400,
     description: 'Description for UI',
     isPremium: true,
     fontFiles: [
       { weight: 400, style: 'normal', url: '/fonts/premium/font-name/font-regular.woff2' },
       { weight: 700, style: 'normal', url: '/fonts/premium/font-name/font-bold.woff2' },
     ],
   }
   ```

3. **Done!** Font is now available in `FontSelector` and will load automatically

## Plan Configuration

To enable/disable premium fonts for a plan:

```sql
-- Enable premium fonts for a plan
UPDATE plans SET feature_premium_fonts = true WHERE name = 'agency';

-- Disable premium fonts for a plan
UPDATE plans SET feature_premium_fonts = false WHERE name = 'starter';
```

## Technical Details

### Font Loading Performance

- **Google Fonts**: Loaded once per page, cached by browser
- **Premium Fonts**: Loaded via @font-face with `font-display: swap`
  - Prevents layout shift during font loading
  - Fallback to system font while loading
  - Cached by browser after first load

### File Formats

- **woff2**: Modern, best compression (~30% smaller than woff)
- **Fallback**: None needed - all modern browsers support woff2
- **Browser support**: 97%+ global coverage

### Security

- Premium fonts are **public files** in `/public/fonts/premium/`
- Access control is **UI-only** (via plan feature check)
- This is acceptable because:
  - Font files are public anyway once site is published
  - UI enforcement prevents accidental use
  - Majority of users won't bypass UI to use premium fonts
  - If they do, it's visible in database (`site.config`)

## Components

### Modified Components

1. **`lib/fonts.ts`**
   - Added `FontFile` interface
   - Extended `FontOption` with `isPremium` and `fontFiles`
   - Added `premiumFonts` array
   - Added `getAllFonts()`, `isPremiumFont()` helpers

2. **`components/builder/FontSelector.tsx`**
   - Added plan feature check via `useAppData()`
   - Added premium badge with crown icon
   - Disables premium fonts for users without access

3. **`components/builder/FontLoader.tsx`**
   - Detects font type (Google vs Premium)
   - Loads Google fonts via CDN
   - Injects @font-face rules for premium fonts

4. **`contexts/app-context.tsx`**
   - Added `feature_premium_fonts` to `hasPlanFeature` type

### Components Using Font Loading

1. **Admin Preview** (`app/(app)/preview/[id]/preview-site-page.tsx`)
   - Used in builder (direct rendering, no iframe)
   - Used in preview route (`/preview/[id]`)
   - Uses `FontLoader` component with fonts from `site.config.theme`

2. **Published Sites** (`app/(z-sites)/[site]/published-site-page.tsx`)
   - Clean public renderer with NO admin dependencies
   - Uses `useSiteFonts` hook (self-contained font loading)
   - Heading font applied via `[data-published-site]` CSS selector

## Current Premium Fonts

1. **Jedira** (Luxury)
   - Elegant serif with italic support
   - Weights: 400 (Regular + Italic)

2. **Prettywise** (Modern)
   - Complete modern sans family
   - Weights: 100-900 (Thin to Heavy)

3. **Poria** (Luxury)
   - Luxury sans with complete weight range
   - Weights: 100, 300, 400, 500, 700, 800, 900

## Future Enhancements

Possible improvements:
- Font preview in selector (show font sample)
- Variable fonts support (single file with all weights)
- Admin panel for managing fonts (if needed)
- Analytics on font usage
- Font subsetting (load only used characters)
