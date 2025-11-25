// Google Fonts configuration for the page builder

export interface FontOption {
  name: string
  value: string
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting'
  weights: number[]
}

/**
 * Curated list of Google Fonts for headings
 * These fonts work well for real estate and luxury property sites
 */
export const headingFonts: FontOption[] = [
  // Serif - Elegant & Classic
  {
    name: 'Playfair Display',
    value: 'Playfair Display',
    category: 'serif',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Cormorant Garamond',
    value: 'Cormorant Garamond',
    category: 'serif',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Libre Baskerville',
    value: 'Libre Baskerville',
    category: 'serif',
    weights: [400, 700],
  },
  {
    name: 'Lora',
    value: 'Lora',
    category: 'serif',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Bodoni Moda',
    value: 'Bodoni Moda',
    category: 'serif',
    weights: [400, 500, 600, 700],
  },
  
  // Sans-serif - Modern & Clean
  {
    name: 'Inter',
    value: 'Inter',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Outfit',
    value: 'Outfit',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Space Grotesk',
    value: 'Space Grotesk',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'DM Sans',
    value: 'DM Sans',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Plus Jakarta Sans',
    value: 'Plus Jakarta Sans',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
  },
  
  // Display - Bold & Statement
  {
    name: 'Bebas Neue',
    value: 'Bebas Neue',
    category: 'display',
    weights: [400],
  },
  {
    name: 'Oswald',
    value: 'Oswald',
    category: 'display',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Archivo Black',
    value: 'Archivo Black',
    category: 'display',
    weights: [400],
  },
  {
    name: 'Syne',
    value: 'Syne',
    category: 'display',
    weights: [400, 500, 600, 700],
  },
  {
    name: 'Fraunces',
    value: 'Fraunces',
    category: 'display',
    weights: [400, 500, 600, 700],
  },
]

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

