/**
 * Icon Mapping Utility
 * 
 * Maps Lucide icon names (used in admin UI) to Phosphor icon names (used in templates)
 * This allows us to use Lucide icons in the icon picker but render Phosphor icons in templates
 */

import { ComponentType } from 'react'
import { IconProps } from '@phosphor-icons/react'
import { 
  Bed, 
  Bathtub, 
  Ruler, 
  Car, 
  House, 
  Tree, 
  SwimmingPool, 
  WifiHigh, 
  Fan, 
  Fire, 
  Television, 
  ForkKnife 
} from '@phosphor-icons/react'

/**
 * Mapping from Lucide icon names to Phosphor icon components
 * Add more mappings as needed
 */
export const lucideToPhosphorMap: Record<string, ComponentType<IconProps>> = {
  // Common property icons
  'bed': Bed,
  'bed-double': Bed,
  'bath': Bathtub,
  'bath-tub': Bathtub,
  'ruler': Ruler,
  'ruler-combined': Ruler,
  'car': Car,
  'car-front': Car,
  'home': House,
  'house': House,
  'trees': Tree,
  'tree-pine': Tree,
  'tree': Tree,
  'pool': SwimmingPool,
  'swimming-pool': SwimmingPool,
  'wifi': WifiHigh,
  'wifi-high': WifiHigh,
  'wifi-off': WifiHigh,
  'fan': Fan,
  'wind': Fan,
  'ac': Fan,
  'heating': Fire,
  'flame': Fire,
  'fire': Fire,
  'tv': Television,
  'television': Television,
  'monitor': Television,
  'kitchen': ForkKnife,
  'utensils': ForkKnife,
  'utensils-crossed': ForkKnife,
}

/**
 * Get Phosphor icon component from Lucide icon name
 * Returns null if no mapping exists
 */
export function getPhosphorIcon(lucideIconName: string | undefined): ComponentType<IconProps> | null {
  if (!lucideIconName) return null
  
  // Try exact match first
  const exactMatch = lucideToPhosphorMap[lucideIconName.toLowerCase()]
  if (exactMatch) return exactMatch
  
  // Try partial match (e.g., "bed-double" -> "bed")
  const parts = lucideIconName.toLowerCase().split('-')
  for (let i = parts.length; i > 0; i--) {
    const partial = parts.slice(0, i).join('-')
    const match = lucideToPhosphorMap[partial]
    if (match) return match
  }
  
  return null
}

/**
 * Get all available icon mappings
 */
export function getAvailableIconMappings(): string[] {
  return Object.keys(lucideToPhosphorMap)
}

/**
 * Convert kebab-case to PascalCase
 * Example: "alarm-clock" -> "AlarmClock"
 */
export function kebabToPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * Get Phosphor icon component directly by icon name (kebab-case)
 * This tries to find the icon in the Phosphor icons library
 * Returns null if icon doesn't exist
 */
export function getPhosphorIconByName(iconName: string | undefined): ComponentType<IconProps> | null {
  if (!iconName) return null
  
  // First try the mapping
  const mapped = getPhosphorIcon(iconName)
  if (mapped) return mapped
  
  // Then try direct lookup by converting to PascalCase
  // This will be used dynamically in the icon picker
  return null // Will be handled dynamically via import
}
