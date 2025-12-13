// Section Color System for Template Sections
// Ensures sections are isolated from admin UI theme and controlled only by colorScheme prop

import { ColorScheme, ThemeConfig } from '@/types/builder'

/**
 * Section color palette interface
 */
export interface SectionColors {
  /** Main background color for the section */
  backgroundColor: string
  /** Primary text color */
  textColor: string
  /** Secondary/muted text color (60% opacity) */
  secondaryTextColor: string
  /** Border color for cards and dividers */
  borderColor: string
  /** Card background color */
  cardBg: string
  /** Card background color on hover */
  cardBgHover: string
  /** Input background color */
  inputBg: string
  /** Input border color */
  inputBorder: string
}

/**
 * Get section colors based on colorScheme
 * 
 * This function ensures sections are completely isolated from the admin UI theme.
 * Colors are determined ONLY by the colorScheme prop ('light' | 'dark').
 * 
 * @param colorScheme - 'light' or 'dark'
 * @param theme - Optional theme config (not used for background, only for accent colors)
 * @returns SectionColors object with all necessary colors
 * 
 * @example
 * ```tsx
 * const colors = getSectionColors('dark', theme)
 * <section style={{ backgroundColor: colors.backgroundColor }}>
 * ```
 */
export function getSectionColors(
  colorScheme: ColorScheme,
  theme?: ThemeConfig
): SectionColors {
  const isDark = colorScheme === 'dark'
  
  if (isDark) {
    return {
      backgroundColor: '#000000',
      textColor: '#ffffff',
      secondaryTextColor: 'rgba(255, 255, 255, 0.6)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      cardBgHover: 'rgba(255, 255, 255, 0.1)',
      inputBg: 'rgba(255, 255, 255, 0.05)',
      inputBorder: 'rgba(255, 255, 255, 0.2)',
    }
  } else {
    return {
      backgroundColor: '#ffffff',
      textColor: theme?.textColor || '#000000',
      secondaryTextColor: 'rgba(0, 0, 0, 0.6)',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      cardBg: 'rgba(0, 0, 0, 0.05)',
      cardBgHover: 'rgba(0, 0, 0, 0.1)',
      inputBg: 'rgba(0, 0, 0, 0.02)',
      inputBorder: 'rgba(0, 0, 0, 0.2)',
    }
  }
}

/**
 * Get primary accent color from theme or default
 */
export function getPrimaryColor(theme?: ThemeConfig, colorScheme: ColorScheme = 'light'): string {
  if (colorScheme === 'dark' && !theme?.primaryColor) {
    return 'rgba(255, 255, 255, 0.7)'
  }
  return theme?.primaryColor || '#3b82f6'
}

