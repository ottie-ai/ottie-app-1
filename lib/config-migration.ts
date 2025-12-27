/**
 * Config Migration Utility
 * 
 * Handles migration between v1 (legacy) and v2 (new) config structures.
 * 
 * V1 (Legacy): sections[] with embedded data, theme, loader, meta
 * V2 (New): siteSettings, sectionSettings[], siteContent
 */

import {
  PageConfig,
  LegacyPageConfig,
  SiteSettings,
  SectionSettings,
  SiteContent,
  ThemeConfig,
  LoaderConfig,
  Section,
  SectionData,
  isV1Config,
  isV2Config,
  SitePhoto,
  SiteHighlight,
  SiteFeature,
  SiteAgent,
  HeroSectionData,
  FeaturesSectionData,
  GallerySectionData,
  AgentSectionData,
  ContactSectionData,
  HighlightsSectionData,
} from '@/types/builder'

// ============================================
// Default Values
// ============================================

export const DEFAULT_THEME: ThemeConfig = {
  fontFamily: 'Inter',
  headingFontFamily: 'Inter',
  headingFontSize: 1,
  headingLetterSpacing: 0,
  titleCase: 'sentence',
  primaryColor: '#000000',
  secondaryColor: '#666666',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  borderRadius: 'md',
  ctaType: 'none',
  ctaValue: '',
  animationStyle: 'none',
  cursorStyle: 'none',
}

export const DEFAULT_LOADER: LoaderConfig = {
  type: 'none',
  colorScheme: 'light',
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  theme: DEFAULT_THEME,
  loader: DEFAULT_LOADER,
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  title: '',
  subtitle: '',
  language: 'en',
  currency: 'USD',
  currency_symbol: '$',
  photos: [],
  address: {},
  price_info: {},
  highlights: [],
  features: [],
  agent: {},
}

// ============================================
// Migration: V1 -> V2
// ============================================

/**
 * Extract SiteContent from legacy sections
 * Combines data from all sections into unified content
 */
function extractSiteContentFromSections(sections: Section[]): SiteContent {
  const content: SiteContent = { ...DEFAULT_SITE_CONTENT }
  
  for (const section of sections) {
    const data = section.data as SectionData
    
    switch (section.type) {
      case 'hero': {
        const heroData = data as HeroSectionData
        if (heroData.headline) content.title = heroData.headline
        // Support both subheadline (legacy) and subtitle (new)
        if (heroData.subtitle) {
          content.subtitle = heroData.subtitle as string
        } else if (heroData.subheadline) {
          content.subtitle = heroData.subheadline as string
        }
        if (heroData.propertyImage || heroData.backgroundImage) {
          const imageUrl = heroData.propertyImage || heroData.backgroundImage
          if (imageUrl && !content.photos?.some(p => p.url === imageUrl)) {
            content.photos = content.photos || []
            content.photos.unshift({ url: imageUrl, label: 'Hero Image' })
          }
        }
        if (heroData.price) {
          content.price_info = content.price_info || {}
          // Try to parse price string to number (remove currency symbols, commas)
          const priceNumber = parseFloat(heroData.price.replace(/[^0-9.]/g, ''))
          if (!isNaN(priceNumber)) {
            content.price_info.price = priceNumber
          }
        }
        if (heroData.address) {
          content.address = content.address || {}
          // Try to parse address string into components
          content.address.street = heroData.address
        }
        break
      }
      
      case 'features': {
        const featuresData = data as FeaturesSectionData
        if (featuresData.features && featuresData.features.length > 0) {
          content.features = featuresData.features.map(f => ({
            icon: f.icon,
            label: f.label,
            value: f.value,
          }))
          
          // Try to extract specific values from features
          for (const feature of featuresData.features) {
            const label = feature.label.toLowerCase()
            const value = feature.value
            
            if (label.includes('bed')) {
              const beds = parseInt(value)
              if (!isNaN(beds)) content.beds = beds
            } else if (label.includes('bath')) {
              const baths = parseFloat(value)
              if (!isNaN(baths)) content.baths = baths
            } else if (label.includes('sqft') || label.includes('sq ft') || label.includes('area')) {
              const area = parseFloat(value.replace(/[^0-9.]/g, ''))
              if (!isNaN(area)) {
                content.living_area = {
                  value: area,
                  unit: 'sqft',
                }
              }
            } else if (label.includes('lot')) {
              const lot = parseFloat(value.replace(/[^0-9.]/g, ''))
              if (!isNaN(lot)) {
                content.lot_size = {
                  value: lot,
                  unit: value.includes('acre') ? 'acres' : 'sqft',
                }
              }
            } else if (label.includes('year') || label.includes('built')) {
              const year = parseInt(value)
              if (!isNaN(year) && year > 1800 && year < 2100) content.year_built = year
            }
          }
        }
        break
      }
      
      case 'gallery': {
        const galleryData = data as GallerySectionData
        if (galleryData.images && galleryData.images.length > 0) {
          const galleryPhotos: SitePhoto[] = galleryData.images.map(img => ({
            url: img.src,
            alt: img.alt,
            label: img.caption,
          }))
          
          // Merge with existing photos, avoiding duplicates
          content.photos = content.photos || []
          for (const photo of galleryPhotos) {
            if (!content.photos.some(p => p.url === photo.url)) {
              content.photos.push(photo)
            }
          }
        }
        break
      }
      
      case 'agent': {
        const agentData = data as AgentSectionData
        content.agent = {
          name: agentData.name,
          title: agentData.title,
          photo: agentData.photo,
          bio: agentData.bio,
          phone: agentData.phone,
          email: agentData.email,
          agency: (agentData.company || agentData.agency) as string | undefined, // Support both for migration
          license: agentData.license,
        }
        break
      }
      
      case 'contact': {
        const contactData = data as ContactSectionData
        // Merge agent contact info
        if (contactData.phone || contactData.email) {
          content.agent = content.agent || {}
          if (contactData.phone) content.agent.phone = contactData.phone
          if (contactData.email) content.agent.email = contactData.email
        }
        // Update address if provided
        if (contactData.address) {
          content.address = content.address || {}
          content.address.street = contactData.address
        }
        break
      }
      
      case 'highlights': {
        const highlightsData = data as HighlightsSectionData
        if (highlightsData.highlights && highlightsData.highlights.length > 0) {
          content.highlights = highlightsData.highlights.map(h => ({
            title: h.title,
            value: h.value || h.text, // Support both "value" (new) and "text" (legacy)
            icon: h.icon,
            photo: h.photo || h.image, // Support both "photo" (new) and "image" (legacy)
          }))
        }
        // If there's an image in highlights section, add to photos
        if (highlightsData.image) {
          content.photos = content.photos || []
          if (!content.photos.some(p => p.url === highlightsData.image)) {
            content.photos.push({ url: highlightsData.image, label: 'Highlights' })
          }
        }
        break
      }
    }
  }
  
  return content
}

/**
 * Convert legacy sections to section settings (without data)
 */
function convertSectionsToSettings(sections: Section[]): SectionSettings[] {
  return sections.map(section => ({
    id: section.id,
    type: section.type,
    variant: section.variant,
    colorScheme: section.colorScheme,
  }))
}

/**
 * Migrate v1 config to v2 config
 */
export function migrateV1ToV2(legacyConfig: LegacyPageConfig): PageConfig {
  // Extract site settings (NO meta - that goes to SiteContent)
  const siteSettings: SiteSettings = {
    theme: legacyConfig.theme || DEFAULT_THEME,
    loader: legacyConfig.loader || DEFAULT_LOADER,
  }
  
  // Convert sections to settings (without data)
  const sectionSettings = convertSectionsToSettings(legacyConfig.sections || [])
  
  // Extract content from sections
  const siteContent = extractSiteContentFromSections(legacyConfig.sections || [])
  
  // Add meta title/description to siteContent if present
  if (legacyConfig.meta) {
    if (legacyConfig.meta.title && !siteContent.title) {
      siteContent.title = legacyConfig.meta.title
    }
    if (legacyConfig.meta.description && !siteContent.subtitle) {
      siteContent.subtitle = legacyConfig.meta.description
    }
  }
  
  return {
    _version: 2,
    siteSettings,
    sectionSettings,
    siteContent,
  }
}

// ============================================
// Migration: V2 -> V1 (for backward compatibility)
// ============================================

/**
 * Generate section data from SiteContent for a specific section type
 */
function generateSectionData(type: string, content: SiteContent): SectionData {
  switch (type) {
    case 'hero':
      // Format price from number
      let priceString = ''
      if (content.price_info?.price) {
        const currency = content.currency_symbol || content.currency || 'USD'
        priceString = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(content.price_info.price)
      }
      
      return {
        headline: content.title || '',
        subtitle: content.subtitle || '',  // Map directly from SiteContent.subtitle
        propertyImage: content.photos?.[0]?.url || '',
        price: priceString,
        address: content.address?.street || '',
        // Property details for HeroRibbon
        beds: content.beds,
        baths: content.baths,
        living_area: content.living_area,
        lot_size: content.lot_size,
        currency_symbol: content.currency_symbol || content.currency,
      } as HeroSectionData
      
    case 'features':
      // Format area measurements
      const livingAreaString = content.living_area?.value 
        ? `${content.living_area.value.toLocaleString()} ${content.living_area.unit || 'sqft'}`
        : ''
      const lotSizeString = content.lot_size?.value
        ? `${content.lot_size.value.toLocaleString()} ${content.lot_size.unit || 'sqft'}`
        : ''
      
      return {
        title: 'Features',
        features: content.features || [
          { label: 'Bedrooms', value: String(content.beds || 0), icon: 'bed' },
          { label: 'Bathrooms', value: String(content.baths || 0), icon: 'bathtub' },
          { label: 'Living Area', value: livingAreaString, icon: 'ruler' },
          { label: 'Lot Size', value: lotSizeString, icon: 'tree' },
        ].filter(f => f.value && f.value !== '0'),
      } as FeaturesSectionData
      
    case 'gallery':
      return {
        title: 'Gallery',
        images: (content.photos || []).map(p => ({
          src: p.url,
          alt: p.alt || '',
          caption: p.label || '',
        })),
        layout: 'grid',
      } as GallerySectionData
      
    case 'agent':
      return {
        name: content.agent?.name || '',
        title: content.agent?.title || '',
        photo: content.agent?.photo || '',
        bio: content.agent?.bio || '',
        phone: content.agent?.phone || '',
        email: content.agent?.email || '',
        company: content.agent?.agency || '', // Use agency (company is legacy)
        license: content.agent?.license || '',
      } as AgentSectionData
      
    case 'contact':
      return {
        title: 'Contact',
        subtitle: 'Get in touch',
        showForm: true,
        showMap: false,
        address: content.address?.street || '',
        phone: content.agent?.phone || '',
        email: content.agent?.email || '',
      } as ContactSectionData
      
    case 'highlights':
      return {
        title: 'Highlights',
        subtitle: content.subtitle || '', // Map subtitle if available
        highlights: (content.highlights || []).map(h => ({
          title: h.title,
          value: h.value,
          icon: h.icon,
          photo: h.photo,
        })),
        image: content.photos?.[1]?.url || content.photos?.[0]?.url || '', // Legacy support
      } as HighlightsSectionData
      
    default:
      return {}
  }
}

/**
 * Convert v2 config back to v1 format (for legacy components)
 */
export function migrateV2ToV1(config: PageConfig): LegacyPageConfig {
  const sections: Section[] = config.sectionSettings.map(settings => ({
    id: settings.id,
    type: settings.type,
    variant: settings.variant,
    colorScheme: settings.colorScheme,
    data: generateSectionData(settings.type, config.siteContent),
  }))
  
  // Extract meta from siteContent (title/subtitle)
  const meta = {
    title: config.siteContent.title || '',
    description: config.siteContent.subtitle || config.siteContent.description || '',
  }
  
  return {
    sections,
    theme: config.siteSettings.theme,
    loader: config.siteSettings.loader,
    meta,
  }
}

// ============================================
// Universal Config Handler
// ============================================

/**
 * Ensure config is in v2 format
 * If v1, migrate to v2. If already v2, return as-is.
 */
export function ensureV2Config(config: unknown): PageConfig {
  if (!config) {
    return {
      _version: 2,
      siteSettings: DEFAULT_SITE_SETTINGS,
      sectionSettings: [],
      siteContent: DEFAULT_SITE_CONTENT,
    }
  }
  
  if (isV2Config(config)) {
    return config
  }
  
  if (isV1Config(config)) {
    return migrateV1ToV2(config)
  }
  
  // Unknown format, return default
  console.warn('[Config Migration] Unknown config format, returning default')
  return {
    _version: 2,
    siteSettings: DEFAULT_SITE_SETTINGS,
    sectionSettings: [],
    siteContent: DEFAULT_SITE_CONTENT,
  }
}

/**
 * Get config in v1 format for legacy components
 * Handles both v1 and v2 input
 */
export function getV1Config(config: unknown): LegacyPageConfig {
  if (!config) {
    return {
      sections: [],
      theme: DEFAULT_THEME,
      loader: DEFAULT_LOADER,
      meta: { title: '', description: '' },
    }
  }
  
  if (isV1Config(config)) {
    return config
  }
  
  if (isV2Config(config)) {
    return migrateV2ToV1(config)
  }
  
  // Unknown format, return default
  console.warn('[Config Migration] Unknown config format, returning default v1')
  return {
    sections: [],
    theme: DEFAULT_THEME,
    loader: DEFAULT_LOADER,
    meta: { title: '', description: '' },
  }
}

// ============================================
// Content Update Helpers
// ============================================

/**
 * Update specific content field in v2 config
 */
export function updateSiteContent(
  config: PageConfig,
  updates: Partial<SiteContent>
): PageConfig {
  return {
    ...config,
    siteContent: {
      ...config.siteContent,
      ...updates,
    },
  }
}

/**
 * Update site settings in v2 config
 */
export function updateSiteSettings(
  config: PageConfig,
  updates: Partial<SiteSettings>
): PageConfig {
  return {
    ...config,
    siteSettings: {
      ...config.siteSettings,
      ...updates,
    },
  }
}

/**
 * Update section settings in v2 config
 */
export function updateSectionSettings(
  config: PageConfig,
  sectionId: string,
  updates: Partial<SectionSettings>
): PageConfig {
  return {
    ...config,
    sectionSettings: config.sectionSettings.map(section =>
      section.id === sectionId
        ? { ...section, ...updates }
        : section
    ),
  }
}

/**
 * Add a new section to v2 config
 */
export function addSection(
  config: PageConfig,
  section: SectionSettings,
  atIndex?: number
): PageConfig {
  const newSections = [...config.sectionSettings]
  if (atIndex !== undefined && atIndex >= 0 && atIndex <= newSections.length) {
    newSections.splice(atIndex, 0, section)
  } else {
    newSections.push(section)
  }
  
  return {
    ...config,
    sectionSettings: newSections,
  }
}

/**
 * Remove a section from v2 config
 */
export function removeSection(
  config: PageConfig,
  sectionId: string
): PageConfig {
  return {
    ...config,
    sectionSettings: config.sectionSettings.filter(s => s.id !== sectionId),
  }
}

/**
 * Reorder sections in v2 config
 */
export function reorderSections(
  config: PageConfig,
  fromIndex: number,
  toIndex: number
): PageConfig {
  const newSections = [...config.sectionSettings]
  const [removed] = newSections.splice(fromIndex, 1)
  newSections.splice(toIndex, 0, removed)
  
  return {
    ...config,
    sectionSettings: newSections,
  }
}



