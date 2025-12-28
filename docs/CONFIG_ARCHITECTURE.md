# Config Architecture v2

This document describes the new configuration architecture for Ottie sites.

## Overview

The site configuration has been refactored from a section-centric model to a content-centric model. This allows:

1. **Same content displayed in multiple sections** - e.g., address shown in Hero, Contact, and Agent sections
2. **Section layout changes without touching content** - switch variants without losing data
3. **Content editing in one place, rendered everywhere** - single source of truth

## Structure Comparison

### V1 (Legacy) Structure

```typescript
interface LegacyPageConfig {
  sections: Section[]  // Each section has its own data
  theme: ThemeConfig
  loader?: LoaderConfig
  meta?: { title, description }
}

interface Section {
  id: string
  type: SectionType
  variant: string
  colorScheme?: ColorScheme
  data: SectionData  // Content embedded in section
}
```

**Problems with V1:**
- Same data (address, agent) duplicated across sections
- Changing section layout could lose content
- No single source of truth for property data

### V2 (New) Structure

```typescript
interface PageConfig {
  _version: 2
  siteSettings: SiteSettings      // Global settings (theme, loader)
  sectionSettings: SectionSettings[]  // Layout only, NO content
  siteContent: SiteContent        // Centralized content (includes title, subtitle for SEO)
}

interface SiteSettings {
  theme: ThemeConfig
  loader?: LoaderConfig
  // Note: SEO metadata (title, description) is in SiteContent, not here
}

interface SectionSettings {
  id: string
  type: SectionType
  variant: string
  colorScheme?: ColorScheme
  // NO data field - content comes from SiteContent
}

interface SiteContent {
  // All property data in one place
  title, subtitle, photos[], address, price_info,
  beds, baths, living_area, lot_size, highlights[],
  features[], agent, description, ...
}
```

## SiteContent Structure

```typescript
interface SiteContent {
  // Basic info
  title?: string
  subtitle?: string
  language?: string
  currency?: string
  currency_symbol?: string
  property_status?: string
  
  // Photos
  photos?: SitePhoto[]
  
  // Location
  address?: SiteAddress
  
  // Pricing
  price_info?: SitePriceInfo
  
  // Property specs
  beds?: number
  baths?: number
  property_type?: PropertyType
  year_built?: number
  is_new_construction?: boolean
  mls_id?: string
  
  // Areas
  living_area?: SiteAreaMeasurement
  lot_size?: SiteAreaMeasurement
  
  // Content
  highlights?: SiteHighlight[]
  description?: string
  
  // Features
  features?: SiteFeature[]
  features_amenities?: SiteFeaturesAmenities
  
  // Contact
  agent?: SiteAgent
  
  // Financial
  mortgage_info?: SiteMortgageInfo
  
  // Media
  virtual_tour_url?: string
  floorplan_url?: string[]
}
```

## Section Content Mapping

Each section type reads from specific SiteContent fields:

| Section Type | Content Fields Used |
|-------------|---------------------|
| `hero` | `title`, `subtitle`, `photos`, `price_info`, `address` |
| `features` | `beds`, `baths`, `living_area`, `lot_size`, `year_built`, `property_type`, `features` |
| `gallery` | `photos` |
| `agent` | `agent` |
| `contact` | `agent`, `address` |
| `highlights` | `highlights`, `description` |

This mapping is defined in `SECTION_CONTENT_FIELDS` constant in `types/builder.ts`.

## Migration

The migration utility handles conversion between v1 and v2:

```typescript
import { ensureV2Config, getV1Config } from '@/lib/config-migration'

// Always get v2 config (migrates if needed)
const config = ensureV2Config(site.config)

// Get v1 config for legacy components
const legacyConfig = getV1Config(site.config)
```

### Migration Functions

- `ensureV2Config(config)` - Returns v2 config, migrates v1 if needed
- `getV1Config(config)` - Returns v1 config, converts v2 if needed
- `migrateV1ToV2(legacyConfig)` - Explicit v1 → v2 migration
- `migrateV2ToV1(config)` - Explicit v2 → v1 migration

### Content Update Helpers

```typescript
import { 
  updateSiteContent, 
  updateSiteSettings, 
  updateSectionSettings,
  addSection,
  removeSection,
  reorderSections
} from '@/lib/config-migration'

// Update content
const newConfig = updateSiteContent(config, { title: 'New Title' })

// Update settings
const newConfig = updateSiteSettings(config, { 
  theme: { ...theme, fontFamily: 'Playfair Display' } 
})

// Update section
const newConfig = updateSectionSettings(config, sectionId, { variant: 'ribbon' })
```

## Component Props

### V2 Components (New)

```typescript
interface SectionComponentPropsV2 {
  sectionSettings: SectionSettings
  siteContent: SiteContent
  theme?: ThemeConfig
  onContentChange?: (updates: Partial<SiteContent>) => void
}
```

### V1 Components (Legacy)

```typescript
interface SectionComponentProps<T extends SectionData> {
  data: T
  theme?: ThemeConfig
  colorScheme?: ColorScheme
  onDataChange?: (data: T) => void
}
```

## Morphing Indicator Integration

The morphing indicator (section editing panel) uses `SECTION_CONTENT_FIELDS` to determine which content fields to show for each section:

```typescript
import { SECTION_CONTENT_FIELDS, SiteContent } from '@/types/builder'

// Get editable fields for current section
const editableFields = SECTION_CONTENT_FIELDS[sectionType]
// e.g., for 'hero': ['title', 'subtitle', 'photos', 'price_info', 'address']
```

When editing a section, only the relevant content fields are shown and updated.

## Backward Compatibility

The system maintains full backward compatibility:

1. **Reading configs** - Both v1 and v2 configs are supported
2. **Legacy components** - Use `getV1Config()` to get section data
3. **Gradual migration** - Configs are migrated on-read, saved as v2

## Best Practices

1. **Always use `ensureV2Config()`** when reading config from database
2. **Use content update helpers** for immutable updates
3. **Check `_version`** to detect config version
4. **Use `SECTION_CONTENT_FIELDS`** to know what each section needs

## Files

- `types/builder.ts` - Type definitions
- `lib/config-migration.ts` - Migration utilities
- `docs/CONFIG_ARCHITECTURE.md` - This documentation



