'use client'

import { useState } from 'react'
import { PageRenderer } from '@/components/builder/SectionRenderer'
import { Section, ThemeConfig } from '@/types/builder'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { getVariants } from '@/components/builder/registry'
import { FontSelector } from '@/components/builder/FontSelector'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'

// Example theme configuration
const exampleTheme: ThemeConfig = {
  fontFamily: 'system-ui, sans-serif',
  headingFontFamily: 'Playfair Display',
  headingFontSize: 1,
  headingLetterSpacing: 0,
  uppercaseTitles: false,
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
    variant: 'full',
    data: {
      headline: 'Own your word, one property at a time',
      subheadline: 'Herman Thompson Jr., a financial planner with Innovative Financial Group in Atlanta, Ga. says he checks his portfolio when he makes a trade.',
      price: 'Articles',
      address: '21 Maine street, DE',
      ctaText: 'Schedule a Tour',
      ctaLink: '#contact',
      propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600',
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

      {/* Settings Panel */}
      <div className="fixed top-4 right-4 z-50 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <Tabs defaultValue="layout" className="w-full">
          <Card>
            <CardHeader className="pb-3">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="typography">Typography</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Layout Tab */}
              <TabsContent value="layout" className="mt-0 space-y-4">
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hero Style
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="flex flex-wrap gap-2">
                      {heroVariants.map(variant => (
                        <Button
                          key={variant}
                          size="sm"
                          variant={currentHeroVariant === variant ? 'default' : 'outline'}
                          onClick={() => swapHeroVariant(variant)}
                          className="capitalize"
                        >
                          {variant}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Typography Tab */}
              <TabsContent value="typography" className="mt-0 space-y-4">
                {/* Font Family Card */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Font Family
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <FontSelector 
                      value={theme.headingFontFamily}
                      onChange={updateHeadingFont}
                    />
                  </CardContent>
                </Card>

                {/* Font Size Card */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                      <span>Font Size</span>
                      <span className="font-mono text-foreground">
                        {Math.round(theme.headingFontSize * 100)}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <Slider
                      value={[theme.headingFontSize]}
                      onValueChange={([value]) => setTheme(prev => ({ ...prev, headingFontSize: value }))}
                      min={0.7}
                      max={1.3}
                      step={0.05}
                      className="w-full"
                    />
                  </CardContent>
                </Card>

                {/* Letter Spacing Card */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                      <span>Letter Spacing</span>
                      <span className="font-mono text-foreground">
                        {theme.headingLetterSpacing > 0 ? '+' : ''}{theme.headingLetterSpacing.toFixed(2)}em
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <Slider
                      value={[theme.headingLetterSpacing]}
                      onValueChange={([value]) => setTheme(prev => ({ ...prev, headingLetterSpacing: value }))}
                      min={-0.05}
                      max={0.15}
                      step={0.01}
                      className="w-full"
                    />
                  </CardContent>
                </Card>

                {/* Style Options Card */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Style Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="uppercase" className="text-sm cursor-pointer">
                        Uppercase Titles
                      </Label>
                      <Switch
                        id="uppercase"
                        checked={theme.uppercaseTitles}
                        onCheckedChange={(checked) => setTheme(prev => ({ ...prev, uppercaseTitles: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
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
