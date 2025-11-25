'use client'

import { useState } from 'react'
import { PageRenderer } from '@/components/builder/SectionRenderer'
import { Section, ThemeConfig } from '@/types/builder'
import { Button } from '@/components/ui/button'
import { getVariants } from '@/components/builder/registry'
import { FontSelector } from '@/components/builder/FontSelector'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'

// Example theme configuration
const exampleTheme: ThemeConfig = {
  fontFamily: 'system-ui, sans-serif',
  headingFontFamily: 'Playfair Display',
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 'lg',
}

// Example sections data (this would come from your database/API)
const initialSections: Section[] = [
  {
    id: 'hero-1',
    type: 'hero',
    variant: 'split', // Try changing this to 'centered'
    data: {
      headline: 'Stunning Modern Villa',
      subheadline: 'Experience luxury living in this beautifully designed 4-bedroom home with panoramic views.',
      price: '$1,250,000',
      address: '123 Oceanview Drive, Malibu, CA 90265',
      ctaText: 'Schedule a Tour',
      ctaLink: '#contact',
      propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    },
  },
  {
    id: 'features-1',
    type: 'features',
    variant: 'grid',
    data: {
      title: 'Property Features',
      features: [
        { icon: 'bed', label: 'Bedrooms', value: '4' },
        { icon: 'bath', label: 'Bathrooms', value: '3.5' },
        { icon: 'ruler', label: 'Sq. Ft.', value: '3,200' },
        { icon: 'car', label: 'Garage', value: '2 Car' },
      ],
    },
  },
]

export default function PreviewPage() {
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [theme, setTheme] = useState<ThemeConfig>(exampleTheme)

  // Get available hero variants for the demo switcher
  const heroVariants = getVariants('hero')

  // Function to swap hero variant
  const swapHeroVariant = (newVariant: string) => {
    setSections(prev => 
      prev.map(section => 
        section.type === 'hero' 
          ? { ...section, variant: newVariant }
          : section
      )
    )
  }

  // Function to update heading font
  const updateHeadingFont = (font: string) => {
    setTheme(prev => ({ ...prev, headingFontFamily: font }))
  }

  const currentHeroVariant = sections.find(s => s.type === 'hero')?.variant || 'split'

  return (
    <div className="min-h-screen bg-background">
      {/* Load Google Fonts dynamically */}
      <FontLoader fonts={[theme.headingFontFamily]} />

      {/* Demo Controls - Remove in production */}
      <div className="fixed top-4 right-4 z-50 bg-card border rounded-lg shadow-lg p-4 space-y-4 w-64">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Hero Variant:</p>
          <div className="flex gap-2">
            {heroVariants.map(variant => (
              <Button
                key={variant}
                size="sm"
                variant={currentHeroVariant === variant ? 'default' : 'outline'}
                onClick={() => swapHeroVariant(variant)}
              >
                {variant}
              </Button>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <FontSelector 
            value={theme.headingFontFamily}
            onChange={updateHeadingFont}
            label="Heading Font"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Font: <code className="bg-muted px-1 rounded">{theme.headingFontFamily}</code>
        </p>
      </div>

      {/* Page Content */}
      <FontTransition font={theme.headingFontFamily}>
        <PageRenderer 
          sections={sections} 
          theme={theme}
        />
      </FontTransition>

      {/* Debug: Show current JSON state */}
      <div className="container mx-auto px-4 py-12">
        <details className="bg-muted rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-sm">
            View Page JSON
          </summary>
          <pre className="mt-4 text-xs overflow-auto p-4 bg-background rounded border">
            {JSON.stringify({ sections, theme }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
