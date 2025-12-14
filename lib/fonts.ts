// Google Fonts configuration for the page builder

export interface FontFile {
  weight: number
  style: 'normal' | 'italic'
  url: string
}

export interface FontOption {
  name: string
  value: string
  category: 'standard' | 'premium'
  weights: number[]
  /** Default font weight for headings - user cannot change this */
  defaultWeight: number
  description?: string
  /** Flag indicating this is a premium (self-hosted) font */
  isPremium?: boolean
  /** Self-hosted font files (only for premium fonts) */
  fontFiles?: FontFile[]
}

/**
 * Curated list of Google Fonts for real estate headings
 * Standard fonts available to all users
 */
export const headingFonts: FontOption[] = [
  // ============================================
  // Standard Fonts
  // ============================================
  {
    name: 'Canela',
    value: 'Canela',
    category: 'standard',
    weights: [100],
    defaultWeight: 100,
    description: 'Ultra-thin, refined serif. Perfect for luxury brands.',
  },
  {
    name: 'Playfair Display',
    value: 'Playfair Display',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'The king of luxury websites. High contrast, bold.',
  },
  {
    name: 'Cormorant Garamond',
    value: 'Cormorant Garamond',
    category: 'standard',
    weights: [300, 400, 500, 600, 700],
    defaultWeight: 300,
    description: 'Very elegant, thin, looks like a fashion magazine.',
  },
  {
    name: 'Cinzel',
    value: 'Cinzel',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'Classic, Roman style. For ultra-premium properties.',
  },
  {
    name: 'Prata',
    value: 'Prata',
    category: 'standard',
    weights: [400],
    defaultWeight: 400,
    description: 'Sophisticated serif that looks great in large sizes.',
  },
  {
    name: 'Bodoni Moda',
    value: 'Bodoni Moda',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'Extreme contrast, very fashionable and modern luxury.',
  },

  // ============================================
  // 2. Modern & Minimalist (Apartments, New Developments, Penthouses)
  // ============================================
  {
    name: 'Inter',
    value: 'Inter',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'The standard for modern web. Readable, neutral.',
  },
  {
    name: 'Montserrat',
    value: 'Montserrat',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Geometric, wide. Feels confident and urban.',
  },
  {
    name: 'Plus Jakarta Sans',
    value: 'Plus Jakarta Sans',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Very popular in tech. Feels fresh and modern.',
  },
  {
    name: 'Manrope',
    value: 'Manrope',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Modern grotesque, pleasant for reading numbers.',
  },
  {
    name: 'Outfit',
    value: 'Outfit',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'A bit bolder, geometric. Great for modern brands.',
  },

  // ============================================
  // 3. Trustworthy & Corporate (Family Homes, Classic Sales)
  // ============================================
  {
    name: 'Lato',
    value: 'Lato',
    category: 'standard',
    weights: [400, 700],
    defaultWeight: 400,
    description: 'Very friendly, rounded, but still professional.',
  },
  {
    name: 'Roboto',
    value: 'Roboto',
    category: 'standard',
    weights: [400, 500, 700],
    defaultWeight: 500,
    description: 'A classic. Offends no one, works everywhere.',
  },
  {
    name: 'Open Sans',
    value: 'Open Sans',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 600,
    description: 'Neutral, open, very readable on mobile.',
  },
  {
    name: 'Merriweather',
    value: 'Merriweather',
    category: 'standard',
    weights: [400, 700],
    defaultWeight: 400,
    description: 'A serif built for screen reading. Feels serious.',
  },
  {
    name: 'Libre Baskerville',
    value: 'Libre Baskerville',
    category: 'standard',
    weights: [400, 700],
    defaultWeight: 400,
    description: 'Traditional, banking style. Feels solid.',
  },

  // ============================================
  // 4. Vacation & Lifestyle (Airbnb, Cabins, Boutique Hotels)
  // ============================================
  {
    name: 'DM Sans',
    value: 'DM Sans',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Modern, but friendlier than Inter. Airbnb vibe.',
  },
  {
    name: 'Fraunces',
    value: 'Fraunces',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'Old-school serif with modern twist. Boutique feel.',
  },
  {
    name: 'Josefin Sans',
    value: 'Josefin Sans',
    category: 'standard',
    weights: [300, 400, 500, 600, 700],
    defaultWeight: 300,
    description: 'Geometric, thin, elegant. Feels feminine and soft.',
  },
  {
    name: 'Archivo',
    value: 'Archivo',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 600,
    description: 'Strong, American style. Good for industrial lofts.',
  },
  {
    name: 'Lora',
    value: 'Lora',
    category: 'standard',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'Beautiful serif with calligraphic elements.',
  },
]

/**
 * Premium self-hosted fonts (requires feature_premium_fonts plan feature)
 * These fonts are loaded via @font-face rules instead of Google Fonts
 */
export const premiumFonts: FontOption[] = [
  // ============================================
  // Premium Fonts
  // ============================================
  {
    name: 'Jedira',
    value: 'Jedira',
    category: 'premium',
    weights: [400],
    defaultWeight: 400,
    description: 'Elegant serif with italic support. Perfect for luxury properties.',
    isPremium: true,
    fontFiles: [
      { weight: 400, style: 'normal', url: '/fonts/premium/Jedira/Jedira-Regular.woff2' },
      { weight: 400, style: 'italic', url: '/fonts/premium/Jedira/Jedira-Italic.woff2' },
    ],
  },

  {
    name: 'Prettywise',
    value: 'Prettywise',
    category: 'premium',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    defaultWeight: 400,
    description: 'Complete modern sans family. Versatile and elegant.',
    isPremium: true,
    fontFiles: [
      { weight: 100, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-Thin.woff2' },
      { weight: 200, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-ExtraLight.woff2' },
      { weight: 300, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-Light.woff2' },
      { weight: 400, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-Regular.woff2' },
      { weight: 500, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-Medium.woff2' },
      { weight: 600, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-SemiBold.woff2' },
      { weight: 700, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-Bold.woff2' },
      { weight: 800, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-ExtraBold.woff2' },
      { weight: 900, style: 'normal', url: '/fonts/premium/Pennywise/Prettywise-Heavy.woff2' },
    ],
  },

  {
    name: 'Poria',
    value: 'Poria',
    category: 'premium',
    weights: [100, 300, 400, 500, 700, 800, 900],
    defaultWeight: 400,
    description: 'Luxury sans with complete weight range. Bold and sophisticated.',
    isPremium: true,
    fontFiles: [
      { weight: 100, style: 'normal', url: '/fonts/premium/Poria/Poria-Thin.woff2' },
      { weight: 300, style: 'normal', url: '/fonts/premium/Poria/Poria-Light.woff2' },
      { weight: 400, style: 'normal', url: '/fonts/premium/Poria/Poria-Regular.woff2' },
      { weight: 500, style: 'normal', url: '/fonts/premium/Poria/Poria-Medium.woff2' },
      { weight: 700, style: 'normal', url: '/fonts/premium/Poria/Poria-Bold.woff2' },
      { weight: 800, style: 'normal', url: '/fonts/premium/Poria/Poria-ExtraBold.woff2' },
      { weight: 900, style: 'normal', url: '/fonts/premium/Poria/Poria-Black.woff2' },
    ],
  },
]

/**
 * Category labels and descriptions
 */
export const categoryInfo: Record<string, { label: string; description: string }> = {
  standard: {
    label: 'Standard',
    description: 'Free Google Fonts available to all users',
  },
  premium: {
    label: 'Premium',
    description: 'Exclusive fonts for premium plans',
  },
}

/**
 * Generate Google Fonts URL for loading fonts
 */
export function getGoogleFontsUrl(fonts: string[], weights: number[] = [400, 500, 600, 700]): string {
  const families = fonts.map(font => {
    const encodedFont = font.replace(/ /g, '+')
    const weightString = weights.join(';')
    return `family=${encodedFont}:wght@${weightString}`
  })
  
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

/**
 * Get all fonts (Google + Premium)
 */
export function getAllFonts(): FontOption[] {
  return [...headingFonts, ...premiumFonts]
}

/**
 * Get font option by value (searches both Google and Premium fonts)
 */
export function getFontByValue(value: string): FontOption | undefined {
  return getAllFonts().find(f => f.value === value)
}

/**
 * Check if font is premium
 */
export function isPremiumFont(fontValue: string): boolean {
  const font = getFontByValue(fontValue)
  return font?.isPremium === true
}

/**
 * Get the default font weight for a given font
 * Each font has a predefined weight that looks best
 */
export function getFontWeight(fontValue: string): number {
  const font = getFontByValue(fontValue)
  return font?.defaultWeight ?? 400
}

/**
 * Group fonts by category (includes both Google and Premium fonts)
 * Premium fonts appear first in each category
 */
export function getFontsByCategory(): Record<string, FontOption[]> {
  const allFonts = getAllFonts()
  return allFonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = []
    }
    acc[font.category].push(font)
    return acc
  }, {} as Record<string, FontOption[]>)
}

