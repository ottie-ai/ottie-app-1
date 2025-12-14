// Site Builder Type Definitions

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
export type SectionType = 'hero' | 'features' | 'gallery' | 'agent' | 'contact'

/**
 * Section variant identifier (e.g., 'split', 'centered', 'minimal')
 */
export type SectionVariant = string

/**
 * Flexible data structure for section content
 * Each section type can have its own specific data shape
 */
export type SectionData = Record<string, unknown>

/**
 * Individual section configuration
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
}

/**
 * Complete site configuration
 */
export interface PageConfig {
  /** Array of sections in display order */
  sections: Section[]
  /** Global theme settings */
  theme: ThemeConfig
  /** Site metadata */
  meta?: {
    title?: string
    description?: string
  }
}

// ============================================
// Section-specific data types
// ============================================

/**
 * Hero section data
 */
export interface HeroSectionData extends SectionData {
  headline: string
  subheadline?: string
  ctaText?: string
  ctaLink?: string
  backgroundImage?: string
  propertyImage?: string
  price?: string
  address?: string
}

/**
 * Features section data
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
 */
export interface GallerySectionData extends SectionData {
  title?: string
  images: Array<{
    src: string
    alt?: string
    caption?: string
  }>
  layout?: 'grid' | 'masonry' | 'carousel'
}

/**
 * Agent section data
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

// ============================================
// Helper types
// ============================================

/**
 * Available variants for each section type
 */
export interface SectionVariants {
  hero: 'split' | 'centered' | 'fullscreen' | 'minimal'
  features: 'grid' | 'list' | 'cards' | 'icons'
  gallery: 'grid' | 'masonry' | 'carousel' | 'lightbox'
  agent: 'card' | 'split' | 'minimal' | 'detailed'
  contact: 'simple' | 'split' | 'map' | 'full'
}

/**
 * Props that every section component receives
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
 * Section component type
 */
export type SectionComponent<T extends SectionData = SectionData> = React.ComponentType<SectionComponentProps<T>>

