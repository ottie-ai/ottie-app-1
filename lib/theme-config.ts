/**
 * Theme Configuration
 * 
 * This file contains theme color values for easy editing.
 * Update the values here and they will be reflected in globals.css
 * 
 * Color format: HSL (Hue, Saturation %, Lightness %)
 */

export const themeColors = {
  // Primary Orange - Used for CTAs and special elements
  primary: {
    hue: 24,
    saturation: 95,
    lightness: 53,
    // Adjust these values to change the orange shade:
    // - Hue (0-360): 20-30 for orange range
    // - Saturation (0-100): Higher = more vibrant
    // - Lightness (0-100): 50-60 for good contrast
  },
  
  // Neutral backgrounds
  dark: {
    background: { hue: 0, saturation: 0, lightness: 9 },      // Very dark gray
    card: { hue: 0, saturation: 0, lightness: 12 },           // Slightly lighter dark gray
    secondary: { hue: 0, saturation: 0, lightness: 15 },       // Medium dark gray
    muted: { hue: 0, saturation: 0, lightness: 15 },           // Medium dark gray
    border: { hue: 0, saturation: 0, lightness: 20 },         // Border gray
  },
  
  light: {
    background: { hue: 0, saturation: 0, lightness: 100 },     // White
    card: { hue: 0, saturation: 0, lightness: 100 },           // White
    secondary: { hue: 0, saturation: 0, lightness: 96 },       // Very light gray
    muted: { hue: 0, saturation: 0, lightness: 96 },           // Very light gray
    border: { hue: 0, saturation: 0, lightness: 90 },          // Light gray
  },
  
  // Foreground text colors
  foreground: {
    dark: { hue: 0, saturation: 0, lightness: 98 },            // Almost white
    light: { hue: 0, saturation: 0, lightness: 9 },           // Almost black
  },
  
  // Destructive (error) colors
  destructive: {
    hue: 0,
    saturation: 84.2,
    lightness: 60.2,
  },
} as const

/**
 * Helper function to format HSL values for CSS
 */
export function formatHSL(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`
}

