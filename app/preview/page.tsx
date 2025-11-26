'use client'

import { useState } from 'react'
import { SectionRenderer } from '@/components/builder/SectionRenderer'
import { SectionEditor } from '@/components/builder/SectionEditor'
import { HeroRemixPanel } from '@/components/builder/settings/PageSettings'
import { PageSettingsPanel } from '@/components/builder/settings/PageSettings'
import { FeaturesRemixPanel } from '@/components/builder/settings/FeaturesSettings'
import { Section, ThemeConfig, HeroSectionData, FeaturesSectionData } from '@/types/builder'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { WorkspaceNavbar } from '@/components/workspace-navbar'
import { FloatingCTAButton } from '@/components/whatsapp-button'

// Example theme configuration
const exampleTheme: ThemeConfig = {
  fontFamily: 'system-ui, sans-serif',
  headingFontFamily: 'Canela',
  headingFontSize: 1,
  headingLetterSpacing: 0,
  uppercaseTitles: false,
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 'lg',
  ctaType: 'whatsapp',
  ctaValue: '',
}

// Example sections data
const initialSections: Section[] = [
  {
    id: 'hero-1',
    type: 'hero',
    variant: 'full',
    data: {
      headline: '21 Maine Street',
      subheadline: 'Herman Thompson Jr., a financial planner with Innovative Financial Group in Atlanta, Ga. says he checks his portfolio when he makes a trade.',
      price: 'Articles',
      address: '21 Maine street, DE',
      ctaText: 'Schedule a Tour',
      ctaLink: '#contact',
      propertyImage: 'https://images.unsplash.com/photo-1679364297777-1db77b6199be?w=1920&q=80',
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
  {
    id: 'gallery-1',
    type: 'gallery',
    variant: 'grid',
    data: {
      title: 'Photo Gallery',
      images: [
        { src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', alt: 'Living room' },
        { src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', alt: 'Kitchen' },
        { src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', alt: 'Bedroom' },
        { src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', alt: 'Exterior' },
      ],
      layout: 'grid',
    },
  },
  {
    id: 'agent-1',
    type: 'agent',
    variant: 'card',
    data: {
      name: 'Sarah Johnson',
      title: 'Senior Real Estate Agent',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      bio: 'With over 15 years of experience in luxury real estate, Sarah specializes in high-end properties and exceptional client service.',
      phone: '+1 (555) 123-4567',
      email: 'sarah@luxuryhomes.com',
      company: 'Luxury Homes RE',
      license: 'DRE# 01234567',
    },
  },
  {
    id: 'contact-1',
    type: 'contact',
    variant: 'simple',
    data: {
      title: 'Schedule a Viewing',
      subtitle: 'Interested in this property? Get in touch with us to schedule a private viewing.',
      showForm: true,
      showMap: false,
      address: '21 Maine Street, Delaware',
      phone: '+1 (555) 123-4567',
      email: 'info@luxuryhomes.com',
    },
  },
]

export default function PreviewPage() {
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [theme, setTheme] = useState<ThemeConfig>(exampleTheme)
  
  // Temporary state for editing (before save)
  const [editingTheme, setEditingTheme] = useState<ThemeConfig>(exampleTheme)
  const [editingVariant, setEditingVariant] = useState<Record<string, string>>({})
  const [editingData, setEditingData] = useState<Record<string, Section['data']>>({})

  // Get current variant for a section
  const getSectionVariant = (sectionId: string, currentVariant: string) => {
    return editingVariant[sectionId] ?? currentVariant
  }

  // Get current data for a section
  const getSectionData = (section: Section) => {
    return editingData[section.id] ?? section.data
  }

  // Update section variant
  const updateSectionVariant = (sectionId: string, variant: string) => {
    setEditingVariant(prev => ({ ...prev, [sectionId]: variant }))
  }

  // Update section data
  const updateSectionData = (sectionId: string, data: Section['data']) => {
    setEditingData(prev => ({ ...prev, [sectionId]: data }))
  }

  // Save changes for a section
  const handleSave = (sectionId: string) => {
    // Apply theme changes
    setTheme(editingTheme)
    
    // Apply variant and data changes
      setSections(prev => 
      prev.map(section => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          variant: editingVariant[sectionId] ?? section.variant,
          data: editingData[sectionId] ?? section.data
        }
      })
      )
    
    // Clear editing state for this section
    setEditingVariant(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
    setEditingData(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
  }

  // Reset editing state when panel closes without saving
  const handleCancel = (sectionId: string) => {
    setEditingTheme(theme)
    setEditingVariant(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
    setEditingData(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
  }

  const heroSection = sections.find((section) => section.type === 'hero')
  const navbarSettingsPanel = (
    <PageSettingsPanel theme={editingTheme} onThemeChange={setEditingTheme} />
  )

  return (
    <div className="min-h-screen">
      {/* Fixed CTA Button */}
      <FloatingCTAButton type={editingTheme.ctaType} value={editingTheme.ctaValue} />
      
      {/* Workspace Navbar */}
      <WorkspaceNavbar
        userName="John Doe"
        userEmail="john@realestate.com"
        companyName="Luxury Homes RE"
        settingsPanel={navbarSettingsPanel}
        onSaveSettings={() => {
          setTheme(editingTheme)
        }}
      />

      {/* Load Google Fonts dynamically */}
      <FontLoader fonts={[editingTheme.headingFontFamily]} />

      {/* Page Content with Section Editors */}
      <div>
      <FontTransition font={editingTheme.headingFontFamily}>
        {sections.map((section) => {
          const currentVariant = getSectionVariant(section.id, section.variant)
            const currentData = getSectionData(section)
            const displaySection = { ...section, variant: currentVariant, data: currentData }

          if (section.type === 'hero') {
            return (
              <SectionEditor
                key={section.id}
                onSave={() => handleSave(section.id)}
                  isFirstSection={true}
                  remixPanel={
                    <HeroRemixPanel
                      variant={currentVariant}
                      data={currentData as HeroSectionData}
                      onVariantChange={(v) => updateSectionVariant(section.id, v)}
                      onDataChange={(data) => updateSectionData(section.id, data)}
                    />
                  }
                >
                  <SectionRenderer
                    section={displaySection}
                    theme={editingTheme}
                    onDataChange={(data) => updateSectionData(section.id, data)}
                  />
                </SectionEditor>
              )
            }

            if (section.type === 'features') {
              return (
                <SectionEditor
                  key={section.id}
                  onSave={() => handleSave(section.id)}
                  remixPanel={
                    <FeaturesRemixPanel
                      variant={currentVariant}
                      data={currentData as FeaturesSectionData}
                    onVariantChange={(v) => updateSectionVariant(section.id, v)}
                      onDataChange={(data) => updateSectionData(section.id, data)}
                  />
                }
              >
                  <SectionRenderer 
                    section={displaySection} 
                    theme={editingTheme}
                    onDataChange={(data) => updateSectionData(section.id, data)}
                  />
              </SectionEditor>
            )
          }

          // Other sections without editor for now
          return (
            <SectionRenderer
              key={section.id}
              section={section}
              theme={editingTheme}
            />
          )
        })}
      </FontTransition>
      </div>

      {/* Debug: Show current JSON state - hidden by default */}
      {false && (
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
      )}
    </div>
  )
}
