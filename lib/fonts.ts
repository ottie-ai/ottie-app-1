// Google Fonts configuration for the page builder

export interface FontOption {
  name: string
  value: string
  category: 'luxury' | 'modern' | 'corporate' | 'lifestyle'
  weights: number[]
  /** Default font weight for headings - user cannot change this */
  defaultWeight: number
  description?: string
}

/**
 * Curated list of Google Fonts for real estate headings
 * Organized by property type and style
 */
export const headingFonts: FontOption[] = [
  // ============================================
  // 1. Luxury & Elegant (Villas, Historic Estates, High-end)
  // ============================================
  {
    name: 'Canela',
    value: 'Canela',
    category: 'luxury',
    weights: [100],
    defaultWeight: 100,
    description: 'Ultra-thin, refined serif. Perfect for luxury brands.',
  },
  {
    name: 'Playfair Display',
    value: 'Playfair Display',
    category: 'luxury',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'The king of luxury websites. High contrast, bold.',
  },
  {
    name: 'Cormorant Garamond',
    value: 'Cormorant Garamond',
    category: 'luxury',
    weights: [300, 400, 500, 600, 700],
    defaultWeight: 300,
    description: 'Very elegant, thin, looks like a fashion magazine.',
  },
  {
    name: 'Cinzel',
    value: 'Cinzel',
    category: 'luxury',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'Classic, Roman style. For ultra-premium properties.',
  },
  {
    name: 'Prata',
    value: 'Prata',
    category: 'luxury',
    weights: [400],
    defaultWeight: 400,
    description: 'Sophisticated serif that looks great in large sizes.',
  },
  {
    name: 'Bodoni Moda',
    value: 'Bodoni Moda',
    category: 'luxury',
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
    category: 'modern',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'The standard for modern web. Readable, neutral.',
  },
  {
    name: 'Montserrat',
    value: 'Montserrat',
    category: 'modern',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Geometric, wide. Feels confident and urban.',
  },
  {
    name: 'Plus Jakarta Sans',
    value: 'Plus Jakarta Sans',
    category: 'modern',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Very popular in tech. Feels fresh and modern.',
  },
  {
    name: 'Manrope',
    value: 'Manrope',
    category: 'modern',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Modern grotesque, pleasant for reading numbers.',
  },
  {
    name: 'Outfit',
    value: 'Outfit',
    category: 'modern',
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
    category: 'corporate',
    weights: [400, 700],
    defaultWeight: 400,
    description: 'Very friendly, rounded, but still professional.',
  },
  {
    name: 'Roboto',
    value: 'Roboto',
    category: 'corporate',
    weights: [400, 500, 700],
    defaultWeight: 500,
    description: 'A classic. Offends no one, works everywhere.',
  },
  {
    name: 'Open Sans',
    value: 'Open Sans',
    category: 'corporate',
    weights: [400, 500, 600, 700],
    defaultWeight: 600,
    description: 'Neutral, open, very readable on mobile.',
  },
  {
    name: 'Merriweather',
    value: 'Merriweather',
    category: 'corporate',
    weights: [400, 700],
    defaultWeight: 400,
    description: 'A serif built for screen reading. Feels serious.',
  },
  {
    name: 'Libre Baskerville',
    value: 'Libre Baskerville',
    category: 'corporate',
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
    category: 'lifestyle',
    weights: [400, 500, 600, 700],
    defaultWeight: 500,
    description: 'Modern, but friendlier than Inter. Airbnb vibe.',
  },
  {
    name: 'Fraunces',
    value: 'Fraunces',
    category: 'lifestyle',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'Old-school serif with modern twist. Boutique feel.',
  },
  {
    name: 'Josefin Sans',
    value: 'Josefin Sans',
    category: 'lifestyle',
    weights: [300, 400, 500, 600, 700],
    defaultWeight: 300,
    description: 'Geometric, thin, elegant. Feels feminine and soft.',
  },
  {
    name: 'Archivo',
    value: 'Archivo',
    category: 'lifestyle',
    weights: [400, 500, 600, 700],
    defaultWeight: 600,
    description: 'Strong, American style. Good for industrial lofts.',
  },
  {
    name: 'Lora',
    value: 'Lora',
    category: 'lifestyle',
    weights: [400, 500, 600, 700],
    defaultWeight: 400,
    description: 'Beautiful serif with calligraphic elements.',
  },
]

/**
 * Category labels and descriptions
 */
export const categoryInfo: Record<string, { label: string; description: string }> = {
  luxury: {
    label: 'Luxury & Elegant',
    description: 'Villas, Historic Estates, High-end',
  },
  modern: {
    label: 'Modern & Minimalist',
    description: 'Apartments, New Developments, Penthouses',
  },
  corporate: {
    label: 'Trustworthy & Corporate',
    description: 'Family Homes, Classic Sales',
  },
  lifestyle: {
    label: 'Vacation & Lifestyle',
    description: 'Airbnb, Cabins, Boutique Hotels',
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
 * Get font option by value
 */
export function getFontByValue(value: string): FontOption | undefined {
  return headingFonts.find(f => f.value === value)
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
 * Group fonts by category
 */
export function getFontsByCategory(): Record<string, FontOption[]> {
  return headingFonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = []
    }
    acc[font.category].push(font)
    return acc
  }, {} as Record<string, FontOption[]>)
}

