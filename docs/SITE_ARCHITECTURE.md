# Site Architecture

This document describes the architecture of sites in Ottie, including how published sites work and the separation between admin UI and public sites.

## Overview

Ottie has two completely separate rendering paths for sites:

1. **Admin/Builder** - For editing and previewing sites in the admin interface
2. **Published Sites** - For public viewing of published property sites

These two paths are intentionally isolated to ensure:
- Published sites have minimal bundle size
- No admin UI code is loaded on public sites
- Clear separation of concerns

## Route Structure

```
app/
├── (app)/                          # Admin routes (protected)
│   ├── sites/[id]/                 # Site management page
│   │   ├── page.tsx                # Site detail page
│   │   ├── site-detail-client.tsx  # Client component with tabs
│   │   ├── site-settings-panel.tsx # Settings panel (font, password, etc.)
│   │   └── site-preview.tsx        # (Legacy) iframe preview
│   └── preview/[id]/               # Admin preview route
│       ├── page.tsx                # Preview page (auth required)
│       └── preview-site-page.tsx   # Preview with editing capabilities
│
└── (z-sites)/                      # Public site routes
    └── [site]/                     # Dynamic site route (slug.ottie.site)
        ├── page.tsx                # Server component - fetches site data
        ├── site-content-client.tsx # Client wrapper
        ├── published-site-page.tsx # Clean public renderer (NO admin deps)
        └── password-check.tsx      # Password protection
```

## Component Hierarchy

### Published Sites (Public)

```
(z-sites)/[site]/page.tsx (Server)
    ↓
    Fetches site config from database
    ↓
site-content-client.tsx (Client)
    ↓
published-site-page.tsx (Client)
    ↓
    ├── Font Loading (useSiteFonts hook)
    ├── Heading Font CSS (scoped to [data-published-site])
    ├── SectionRenderer (for each section)
    └── FloatingCTAButton
```

### Admin Preview (Protected)

```
(app)/sites/[id]/page.tsx (Server)
    ↓
site-detail-client.tsx (Client)
    ↓
    Tabs: Website | Settings | Analytics | Leads
    ↓
(app)/preview/[id]/preview-site-page.tsx (Client)
    ↓
    ├── FontLoader
    ├── FontTransition
    ├── SectionRenderer (with editing state)
    ├── SectionMorphingIndicator (admin UI)
    └── FloatingCTAButton
```

## Key Differences

| Aspect | Published Sites | Admin Preview |
|--------|-----------------|---------------|
| **Component** | `PublishedSitePage` | `PreviewSitePage` |
| **Location** | `(z-sites)/[site]/` | `(app)/preview/[id]/` |
| **Authentication** | None (public) | Required |
| **Editing** | No | Yes |
| **Admin UI** | None | SectionMorphingIndicator, etc. |
| **Context** | None | AppContext, Auth |
| **Dependencies** | Minimal | Full app dependencies |

## Published Site Components

### 1. PublishedSitePage (`published-site-page.tsx`)

This is the main component for rendering public sites. It's designed to be:

- **Clean**: No admin UI dependencies
- **Fast**: Minimal JavaScript bundle
- **Isolated**: Doesn't import workspace/context code
- **Self-contained**: Has its own font loading logic

```typescript
// Dependencies (minimal)
import { Site } from '@/types/database'
import { PageConfig, Section, ThemeConfig } from '@/types/builder'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import { getFontByValue, getGoogleFontsUrl } from '@/lib/fonts'
```

### 2. SiteContentClient (`site-content-client.tsx`)

Thin client wrapper that:
- Receives site config from server component
- Passes data to PublishedSitePage
- Has no state management

### 3. Server Page (`page.tsx`)

Server component that:
- Fetches site data from Supabase
- Checks if site is published
- Handles password protection
- Generates SEO metadata

## Font Loading

Published sites load fonts independently:

1. **Google Fonts**: Loaded via `<link>` tag in `<head>`
2. **Premium Fonts**: Loaded via `@font-face` CSS rules

Fonts are scoped to the site:
```css
[data-published-site] h1,
[data-published-site] h2,
/* ... */
[data-published-site] h6 {
  font-family: 'HeadingFont', system-ui, sans-serif !important;
}
```

## Publishing Flow

1. User clicks "Publish" in admin UI
2. Site status changes from `draft` to `published`
3. Site becomes accessible at `slug.ottie.site`
4. Middleware routes request to `(z-sites)/[site]/page.tsx`
5. Server fetches site config
6. `PublishedSitePage` renders the site

## Security

- Published sites only load from database
- Site config is read-only (no mutations)
- Password protection is handled server-side
- No admin credentials exposed to public

## Performance

Published sites are optimized for:

1. **Minimal bundle**: Only essential components loaded
2. **Font loading**: Uses `font-display: swap` for fast text rendering
3. **No context providers**: No React context overhead
4. **Server rendering**: Initial HTML rendered on server

## Adding New Features to Published Sites

When adding features to published sites:

1. **Do NOT import** from `@/components/workspace/`
2. **Do NOT import** from `@/contexts/`
3. **Do NOT use** `useAuth`, `useAppData`, etc.
4. **Keep dependencies minimal** - only what's needed for rendering

If you need shared logic, create it in:
- `@/lib/` for utilities
- `@/components/shared/` for shared UI components
- `@/components/templates/` for section components

## Testing

To test published site rendering:

1. Create a site in admin UI
2. Add sections and configure theme
3. Publish the site
4. Visit `slug.ottie.site` (or `localhost:3000/slug` in dev)
5. Verify:
   - Fonts load correctly
   - Sections render correctly
   - No admin UI visible
   - No console errors
   - Page source has no admin code

## Troubleshooting

### Font not loading on published site

1. Check browser Network tab for font requests
2. Verify font files exist in `/public/fonts/premium/`
3. Check `[data-published-site]` attribute is present
4. Verify CSS rule is injected (Elements tab)

### Admin UI appearing on published site

1. Verify using `PublishedSitePage` not `PreviewSitePage`
2. Check imports in `site-content-client.tsx`
3. Ensure no admin components imported

### Sections not rendering

1. Check site.config in database
2. Verify sections array is not empty
3. Check SectionRenderer for errors
