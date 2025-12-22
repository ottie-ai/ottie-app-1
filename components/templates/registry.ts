// Component Registry for Site Builder
// Maps section types and variants to their React components

import { SectionType, SectionVariant, SectionComponentProps } from '@/types/builder'
import React from 'react'

// Import Hero variants
import { HeroFull } from '@/components/templates/hero/HeroFull'
import { HeroRibbon } from '@/components/templates/hero/HeroRibbon'

// Import Features variants
import { FeaturesGrid, FeaturesList, FeaturesMinimal } from '@/components/templates/features'

// Import Gallery variants
import { GalleryGrid, GalleryHorizontal } from '@/components/templates/gallery'

// Import Agent variants
import { AgentCard } from '@/components/templates/agent'

// Import Contact variants
import { ContactSimple } from '@/components/templates/contact'

// Import Highlights variants
import { HighlightsCards, HighlightsSimple, HighlightsTimeline } from '@/components/templates/highlights'

/**
 * Generic section component type that accepts any data shape
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySectionComponent = React.ComponentType<SectionComponentProps<any>>

/**
 * Registry structure: { sectionType: { variant: Component } }
 */
type RegistryMap = {
  [K in SectionType]?: {
    [variant: string]: AnySectionComponent
  }
}

/**
 * Component registry mapping section types and variants to components
 * 
 * To add a new variant:
 * 1. Create the component in components/templates/{type}/{VariantName}.tsx
 * 2. Import it at the top of this file
 * 3. Add it to the registry below
 */
export const componentRegistry: RegistryMap = {
  hero: {
    full: HeroFull,
    ribbon: HeroRibbon,
  },
  features: {
    grid: FeaturesGrid,
    list: FeaturesList,
    minimal: FeaturesMinimal,
  },
  gallery: {
    grid: GalleryGrid,
    horizontal: GalleryHorizontal,
  },
  agent: {
    card: AgentCard,
  },
  contact: {
    simple: ContactSimple,
  },
  highlights: {
    cards: HighlightsCards,
    simple: HighlightsSimple,
    timeline: HighlightsTimeline,
  },
}

/**
 * Get a component from the registry
 * @param type - Section type (hero, features, etc.)
 * @param variant - Section variant (split, centered, etc.)
 * @returns The component if found, undefined otherwise
 */
export function getComponent(
  type: SectionType,
  variant: SectionVariant
): AnySectionComponent | undefined {
  return componentRegistry[type]?.[variant]
}

/**
 * Check if a variant exists for a given section type
 */
export function hasVariant(type: SectionType, variant: SectionVariant): boolean {
  return !!componentRegistry[type]?.[variant]
}

/**
 * Get all available variants for a section type
 */
export function getVariants(type: SectionType): SectionVariant[] {
  const typeRegistry = componentRegistry[type]
  return typeRegistry ? Object.keys(typeRegistry) : []
}

/**
 * Get all registered section types
 */
export function getSectionTypes(): SectionType[] {
  return Object.keys(componentRegistry) as SectionType[]
}

