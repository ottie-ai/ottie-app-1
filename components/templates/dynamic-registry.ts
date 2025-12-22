// Dynamic Component Registry for Site Builder
// Uses Next.js dynamic imports for code splitting and tree-shaking
// Each section is loaded only when needed in production

import dynamic from 'next/dynamic'
import { SectionType, SectionVariant, SectionComponentProps } from '@/types/builder'
import React from 'react'

/**
 * Generic section component type that accepts any data shape
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySectionComponent = React.ComponentType<SectionComponentProps<any>>

/**
 * Registry structure: { sectionType: { variant: () => Component } }
 * Each component is wrapped in a dynamic import for lazy loading
 */
type DynamicRegistryMap = {
  [K in SectionType]?: {
    [variant: string]: () => Promise<{ default: AnySectionComponent }>
  }
}

/**
 * Dynamic component registry - all imports are lazy loaded
 * This ensures that only the sections used on a page are bundled
 * 
 * To add a new variant:
 * 1. Create the component in components/templates/{type}/{VariantName}.tsx
 * 2. Add a dynamic import entry below
 * 3. The component will be automatically code-split
 */
export const dynamicRegistry: DynamicRegistryMap = {
  hero: {
    full: () => import('./hero/HeroFull').then(mod => ({ default: mod.HeroFull })),
    ribbon: () => import('./hero/HeroRibbon').then(mod => ({ default: mod.HeroRibbon })),
  },
  features: {
    grid: () => import('./features/FeaturesGrid').then(mod => ({ default: mod.FeaturesGrid })),
    list: () => import('./features/FeaturesList').then(mod => ({ default: mod.FeaturesList })),
    minimal: () => import('./features/FeaturesMinimal').then(mod => ({ default: mod.FeaturesMinimal })),
  },
  gallery: {
    grid: () => import('./gallery/GalleryGrid').then(mod => ({ default: mod.GalleryGrid })),
    horizontal: () => import('./gallery/GalleryHorizontal').then(mod => ({ default: mod.GalleryHorizontal })),
  },
  agent: {
    card: () => import('./agent/AgentCard').then(mod => ({ default: mod.AgentCard })),
  },
  contact: {
    simple: () => import('./contact/ContactSimple').then(mod => ({ default: mod.ContactSimple })),
  },
  highlights: {
    cards: () => import('./highlights/HighlightsCards').then(mod => ({ default: mod.HighlightsCards })),
    simple: () => import('./highlights/HighlightsSimple').then(mod => ({ default: mod.HighlightsSimple })),
    timeline: () => import('./highlights/HighlightsTimeline').then(mod => ({ default: mod.HighlightsTimeline })),
  },
}

/**
 * Cache for dynamically imported components
 * Prevents re-importing the same component multiple times
 */
const componentCache = new Map<string, AnySectionComponent>()

/**
 * Get a dynamically loaded component from the registry
 * @param type - Section type (hero, features, etc.)
 * @param variant - Section variant (split, centered, etc.)
 * @returns Promise resolving to the component, or undefined if not found
 */
export async function getDynamicComponent(
  type: SectionType,
  variant: SectionVariant
): Promise<AnySectionComponent | undefined> {
  const cacheKey = `${type}/${variant}`
  
  // Check cache first
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey)
  }
  
  // Get the dynamic import function
  const importFn = dynamicRegistry[type]?.[variant]
  if (!importFn) {
    return undefined
  }
  
  // Import and cache the component
  try {
    const module = await importFn()
    componentCache.set(cacheKey, module.default)
    return module.default
  } catch (error) {
    console.error(`Failed to load component: ${type}/${variant}`, error)
    return undefined
  }
}

/**
 * Get a Next.js dynamic component with SSR support
 * Use this when you need the component immediately with loading state
 */
export function getDynamicComponentWithLoading(
  type: SectionType,
  variant: SectionVariant
): React.ComponentType<SectionComponentProps<any>> | null {
  const importFn = dynamicRegistry[type]?.[variant]
  if (!importFn) {
    return null
  }
  
  return dynamic(importFn, {
    ssr: true,
    loading: () => null, // No loading state - section just appears
  })
}

/**
 * Check if a variant exists for a given section type
 */
export function hasVariant(type: SectionType, variant: SectionVariant): boolean {
  return !!dynamicRegistry[type]?.[variant]
}

/**
 * Get all available variants for a section type
 */
export function getVariants(type: SectionType): SectionVariant[] {
  const typeRegistry = dynamicRegistry[type]
  return typeRegistry ? Object.keys(typeRegistry) : []
}

/**
 * Get all registered section types
 */
export function getSectionTypes(): SectionType[] {
  return Object.keys(dynamicRegistry) as SectionType[]
}

/**
 * Preload a component (useful for hover states or anticipated navigation)
 */
export function preloadComponent(type: SectionType, variant: SectionVariant): void {
  const importFn = dynamicRegistry[type]?.[variant]
  if (importFn) {
    // Fire and forget - just trigger the import
    importFn().catch(() => {
      // Silently ignore preload errors
    })
  }
}

/**
 * Preload all variants for a section type
 */
export function preloadSectionType(type: SectionType): void {
  const variants = getVariants(type)
  variants.forEach(variant => preloadComponent(type, variant))
}
