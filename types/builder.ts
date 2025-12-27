// Site Builder Type Definitions
// ============================================
// NEW CONFIG ARCHITECTURE (v2)
// ============================================
// PageConfig is now split into 3 parts:
// 1. SiteSettings - Global site settings (theme, loader, meta)
// 2. SectionSettings - Per-section layout settings (NO content)
// 3. SiteContent - Centralized property content data
//
// This allows:
// - Same content displayed in multiple sections
// - Section layout changes without touching content
// - Content editing in one place, rendered everywhere
// ============================================

/**
 * CTA button types for floating action button
 */
export type CTAType = 'none' | 'whatsapp' | 'phone' | 'email'

/**
 * Color scheme for sections - determines background and text colors
 */
export type ColorScheme = 'light' | 'dark'

/**
 * Available section types in the site builder
 */
export type SectionType = 'hero' | 'features' | 'gallery' | 'agent' | 'contact' | 'highlights'

/**
 * Section variant identifier (e.g., 'split', 'centered', 'minimal')
 */
export type SectionVariant = string

// ============================================
// SITE SETTINGS (Global)
// ============================================

/**
 * Theme configuration for the entire site
 */
export interface ThemeConfig {
  /** Primary font family for body text */
  fontFamily: string
  /** Font family for headings/titles */
  headingFontFamily: string
  /** Heading font size multiplier (0.8 - 1.4) */
  headingFontSize: number
  /** Heading letter spacing (-0.05 to 0.1) */
  headingLetterSpacing: number
  /** Text case for headings: uppercase, title case, or sentence case */
  titleCase?: 'uppercase' | 'title' | 'sentence'
  /** Primary brand color (hex) */
  primaryColor: string
  /** Secondary/accent color (hex) */
  secondaryColor: string
  /** Background color (hex) */
  backgroundColor: string
  /** Text color (hex) */
  textColor: string
  /** Border radius size */
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  /** Floating CTA button type */
  ctaType?: CTAType
  /** CTA value (phone number, email, etc.) */
  ctaValue?: string
  /** Animation style for reveal animations (blur, fade-in, etc.) */
  animationStyle?: 'blur' | 'fade-in' | 'slide-up' | 'none'
  /** Cursor style for interactive elements (none, frosty, circle) */
  cursorStyle?: 'none' | 'frosty' | 'circle'
}

/**
 * Loader configuration for site loading animation
 */
export interface LoaderConfig {
  /** Type of loader animation */
  type: 'circle' | 'none'
  /** Color scheme for the loader (light/dark) */
  colorScheme: 'light' | 'dark'
}

/**
 * Site-wide settings (theme + loader)
 * Note: SEO metadata (title, description) comes from SiteContent, not here
 */
export interface SiteSettings {
  /** Global theme settings */
  theme: ThemeConfig
  /** Loader configuration for site loading animation */
  loader?: LoaderConfig
}

// ============================================
// SECTION SETTINGS (Per-section layout, NO content)
// ============================================

/**
 * Individual section settings (layout only, no content)
 * Content comes from SiteContent
 */
export interface SectionSettings {
  /** Unique identifier for the section */
  id: string
  /** Type of section (hero, features, etc.) */
  type: SectionType
  /** Visual variant of the section (split, centered, etc.) */
  variant: SectionVariant
  /** Color scheme for this section (light/dark) */
  colorScheme?: ColorScheme
}

// ============================================
// SITE CONTENT (Centralized property data)
// ============================================

/**
 * Photo/image item
 */
export interface SitePhoto {
  url: string
  alt?: string
  label?: string
}

/**
 * Address structure
 */
export interface SiteAddress {
  street?: string
  city?: string
  neighborhood?: string
  state?: string
  zipcode?: string
  county?: string
  country?: string
  subdivision?: string
}

/**
 * Price information
 */
export interface SitePriceInfo {
  price?: number
  is_discounted?: boolean
  original_price?: number
  price_per_unit?: {
    amount?: number
    unit?: string
  }
}

/**
 * Area measurement (living area, lot size, etc.)
 */
export interface SiteAreaMeasurement {
  value?: number
  unit?: string
}

/**
 * Property highlight item
 * Matches site-config-sample.json structure
 */
export interface SiteHighlight {
  title: string
  value?: string  // Main content/value text
  icon?: string
  photo?: string  // Photo URL (not "image")
}

/**
 * Property feature item
 */
export interface SiteFeature {
  icon?: string
  label: string
  value: string
}

/**
 * Features and amenities structure
 */
export interface SiteFeaturesAmenities {
  interior?: {
    amenities?: string[]
    floor_covering?: string[]
    kitchen_features?: string[]
    heating?: string[]
    cooling?: string[]
    fireplace?: boolean
  }
  appliances?: string[]
  parking?: {
    type?: string
    spaces?: number
    covered?: boolean
  }
  outdoor?: {
    amenities?: string[]
    pool?: boolean
    balcony_terrace?: boolean
    garden?: boolean
  }
  building?: {
    architecture_style?: string
    exterior_type?: string
    elevator?: boolean
    security_features?: string[]
  }
  energy?: {
    energy_rating?: string
    solar?: boolean
    ev_charger?: boolean
  }
}

/**
 * Agent/contact information
 */
export interface SiteAgent {
  name?: string
  title?: string
  agency?: string
  phone?: string
  email?: string
  photo?: string
  bio?: string
  license?: string
}

/**
 * Mortgage/financial information
 */
export interface SiteMortgageInfo {
  interest_rate?: number
  property_tax?: {
    amount?: number
    period?: 'annual' | 'monthly' | 'unknown'
  }
  hoa_fee?: {
    amount?: number
    period?: 'monthly' | 'quarterly' | 'annual' | 'unknown'
  }
}

/**
 * Property type enum
 */
export type PropertyType = 
  | 'SINGLE_FAMILY' 
  | 'CONDO' 
  | 'TOWNHOUSE' 
  | 'MULTI_FAMILY' 
  | 'LAND' 
  | 'COMMERCIAL' 
  | 'APARTMENT'
  | 'VILLA'
  | 'PENTHOUSE'
  | 'OTHER'

/**
 * Centralized site content - ALL property data in one place
 * Sections read from this, editing updates this
 */
export interface SiteContent {
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

// ============================================
// PAGE CONFIG (New v2 structure)
// ============================================

/**
 * Complete site configuration (v2)
 * Split into 3 clear parts: settings, section layout, content
 */
export interface PageConfig {
  /** Config version for migration detection */
  _version?: 2
  
  /** Global site settings (theme, loader) */
  siteSettings: SiteSettings
  
  /** Array of section settings in display order (NO content) */
  sectionSettings: SectionSettings[]
  
  /** Centralized property content (includes title, subtitle for SEO) */
  siteContent: SiteContent
}

// ============================================
// LEGACY SUPPORT (v1 structure)
// ============================================

/**
 * Flexible data structure for section content (LEGACY)
 * @deprecated Use SiteContent instead
 */
export type SectionData = Record<string, unknown>

/**
 * Individual section configuration (LEGACY - includes data)
 * @deprecated Use SectionSettings + SiteContent instead
 */
export interface Section<T extends SectionData = SectionData> {
  /** Unique identifier for the section */
  id: string
  /** Type of section (hero, features, etc.) */
  type: SectionType
  /** Visual variant of the section (split, centered, etc.) */
  variant: SectionVariant
  /** Section-specific data/content */
  data: T
  /** Color scheme for this section (light/dark) */
  colorScheme?: ColorScheme
}

/**
 * Legacy PageConfig structure (v1)
 * @deprecated Use PageConfig (v2) instead
 */
export interface LegacyPageConfig {
  /** Array of sections in display order */
  sections: Section[]
  /** Global theme settings */
  theme: ThemeConfig
  /** Site metadata (legacy - use SiteContent.title/subtitle in v2) */
  meta?: {
    title?: string
    description?: string
  }
  /** Loader configuration for site loading animation */
  loader?: LoaderConfig
}

// ============================================
// Section-specific data types (LEGACY)
// These are kept for backward compatibility
// New sections should read from SiteContent
// ============================================

/**
 * Hero section data
 * @deprecated Read from SiteContent instead
 */
export interface HeroSectionData extends SectionData {
  headline: string
  subtitle?: string  // Changed from subheadline to subtitle for consistency with SiteContent
  ctaText?: string
  ctaLink?: string
  backgroundImage?: string
  propertyImage?: string
  price?: string
  address?: string
  // Property details for HeroRibbon
  beds?: number
  baths?: number
  living_area?: { value?: number; unit?: string }
  lot_size?: { value?: number; unit?: string }
  currency_symbol?: string
}

/**
 * Features section data
 * @deprecated Read from SiteContent instead
 */
export interface FeaturesSectionData extends SectionData {
  title?: string
  features: Array<{
    icon?: string
    label: string
    value: string
  }>
}

/**
 * Gallery section data
 * @deprecated Read from SiteContent instead
 */
export interface GallerySectionData extends SectionData {
  title?: string
  type?: 'simple' | string
  images: Array<{
    src: string
    alt?: string
    caption?: string
  }>
  layout?: 'grid' | 'masonry' | 'carousel'
}

/**
 * Agent section data
 * @deprecated Read from SiteContent instead
 */
export interface AgentSectionData extends SectionData {
  name: string
  title?: string
  photo?: string
  bio?: string
  phone?: string
  email?: string
  company?: string
  license?: string
}

/**
 * Contact section data
 * @deprecated Read from SiteContent instead
 */
export interface ContactSectionData extends SectionData {
  title?: string
  subtitle?: string
  showForm?: boolean
  showMap?: boolean
  address?: string
  phone?: string
  email?: string
}

/**
 * Highlights section data
 * @deprecated Read from SiteContent instead
 */
export interface HighlightsSectionData extends SectionData {
  title?: string
  subtitle?: string  // Section subtitle
  image?: string  // Section image (legacy - use photo from highlights)
  highlights: Array<{
    title: string
    value?: string  // Changed from "text" to "value" to match SiteContent
    text?: string  // Legacy support - use "value" instead
    icon?: string // Phosphor icon name (e.g., 'bed', 'bath', 'car')
    photo?: string  // Changed from "image" to "photo" to match SiteContent
    image?: string  // Legacy support - use "photo" instead
  }>
}

// ============================================
// Helper types
// ============================================

/**
 * Available variants for each section type
 */
export interface SectionVariants {
  hero: 'full' | 'ribbon'
  features: 'grid' | 'list' | 'cards' | 'icons'
  gallery: 'grid' | 'masonry' | 'carousel' | 'lightbox' | 'horizontal'
  agent: 'card' | 'split' | 'minimal' | 'detailed'
  contact: 'simple' | 'split' | 'map' | 'full'
  highlights: 'cards' | 'simple' | 'timeline'
}

/**
 * Content field mapping - which SiteContent fields each section type uses
 * Used by morphing indicator to show relevant content editing
 */
export const SECTION_CONTENT_FIELDS: Record<SectionType, (keyof SiteContent)[]> = {
  hero: ['title', 'subtitle', 'photos', 'price_info', 'address'],
  features: ['beds', 'baths', 'living_area', 'lot_size', 'year_built', 'property_type', 'features'],
  gallery: ['photos'],
  agent: ['agent'],
  contact: ['agent', 'address'],
  highlights: ['highlights', 'description'],
}

// ============================================
// Component Props (v2 - uses SiteContent)
// ============================================

/**
 * Props for new section components (v2)
 * Uses centralized SiteContent instead of per-section data
 */
export interface SectionComponentPropsV2 {
  /** Section settings (id, type, variant, colorScheme) */
  sectionSettings: SectionSettings
  /** Centralized site content */
  siteContent: SiteContent
  /** Global theme settings */
  theme?: ThemeConfig
  /** Callback for editing content - updates SiteContent */
  onContentChange?: (updates: Partial<SiteContent>) => void
}

/**
 * Section component type (v2)
 */
export type SectionComponentV2 = React.ComponentType<SectionComponentPropsV2>

// ============================================
// Legacy Component Props (v1 - per-section data)
// ============================================

/**
 * Props that every section component receives (LEGACY)
 * @deprecated Use SectionComponentPropsV2 instead
 */
export interface SectionComponentProps<T extends SectionData = SectionData> {
  data: T
  theme?: ThemeConfig
  /** Color scheme for this section */
  colorScheme?: ColorScheme
  /** Callback for editing data - if provided, component shows edit buttons */
  onDataChange?: (data: T) => void
}

/**
 * Section component type (LEGACY)
 * @deprecated Use SectionComponentV2 instead
 */
export type SectionComponent<T extends SectionData = SectionData> = React.ComponentType<SectionComponentProps<T>>

// ============================================
// Config Detection & Migration Helpers
// ============================================

/**
 * Check if config is v2 (new structure)
 */
export function isV2Config(config: unknown): config is PageConfig {
  if (!config || typeof config !== 'object') return false
  const c = config as Record<string, unknown>
  return c._version === 2 || ('siteSettings' in c && 'sectionSettings' in c && 'siteContent' in c)
}

/**
 * Check if config is v1 (legacy structure)
 */
export function isV1Config(config: unknown): config is LegacyPageConfig {
  if (!config || typeof config !== 'object') return false
  const c = config as Record<string, unknown>
  return 'sections' in c && 'theme' in c && !('siteSettings' in c)
}

/**
 * Type for any config (v1 or v2)
 */
export type AnyPageConfig = PageConfig | LegacyPageConfig

// ============================================
// Image Vision Analysis Types
// ============================================

/**
 * Individual image analysis scores
 */
export interface ImageScores {
  /** Composition score (0-10): Wide angle, symmetrical, balanced framing */
  composition: number
  /** Lighting score (0-10): Bright, natural light, no dark corners */
  lighting: number
  /** Wow factor score (0-10): Does it sell the lifestyle? */
  wow_factor: number
  /** Quality score (0-10): Sharpness, resolution, professional feel */
  quality: number
}

/**
 * Analysis result for a single image
 */
export interface ImageAnalysisItem {
  /** 0-based index of the image in the photos array */
  index: number
  /** URL of the analyzed image */
  url: string
  /** Brief description of what's in the image */
  description: string
  /** Overall score (0-10), average of the four criteria */
  score: number
  /** Individual scores for each criterion */
  scores: ImageScores
}

/**
 * Complete image analysis result from Llama 3.2 Vision
 * Used to determine the best hero image for real estate listings
 */
export interface ImageAnalysisResult {
  /** 0-based index of the best image for hero section */
  best_hero_index: number
  /** URL of the best hero image */
  best_hero_url: string
  /** Reasoning for why this image was selected */
  reasoning: string
  /** Analysis results for each analyzed image */
  images: ImageAnalysisItem[]
  /** Number of images that were analyzed */
  analyzed_count: number
  /** Total number of images in the original photos array */
  total_images: number
  /** Duration of the vision API call in milliseconds */
  call_duration_ms: number
  /** Usage statistics from the API call */
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

