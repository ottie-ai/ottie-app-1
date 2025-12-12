'use client'

import { useEffect, useState, useRef } from 'react'
import { Site } from '@/types/database'
import type { PageConfig, Section } from '@/types/builder'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import { SectionMorphingIndicator } from '@/components/shared/section-morphing-indicator'

// Test sections (hardcoded for testing when site has no sections)
const testSections: Section[] = [
  {
    id: 'hero-1',
    type: 'hero',
    variant: 'full',
    colorScheme: 'dark',
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
    colorScheme: 'light',
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
    colorScheme: 'dark',
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
    colorScheme: 'light',
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
    colorScheme: 'dark',
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

interface PreviewSitePageProps {
  site: Site
  canEdit?: boolean
}

/**
 * Clean Preview Site Page - NO Admin Elements
 * 
 * This is a clean preview without:
 * - WorkspaceNavbar
 * - Remix buttons
 * - Section editors
 * - Settings panels
 * 
 * Archived version with admin elements: preview-site-page-archived-with-admin.tsx
 */
export function PreviewSitePage({ site, canEdit = false }: PreviewSitePageProps) {
  const config = site.config as PageConfig | null

  // Default config if missing
  const siteConfig: PageConfig = config || {
    theme: {
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
      headingFontSize: 1,
      headingLetterSpacing: 0,
      uppercaseTitles: false,
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      borderRadius: 'md',
      ctaType: 'none',
      ctaValue: '',
    },
    sections: [],
  }

  const { theme, sections: initialSections } = siteConfig
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''

  // Get actual sections from config (prioritize config over default)
  // If no sections, use test sections (hardcoded for testing)
  const actualSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
    ? config.sections 
    : (initialSections && initialSections.length > 0 ? initialSections : testSections)

  const [sections, setSections] = useState<Section[]>(actualSections)
  const [activeSection, setActiveSection] = useState<Section | null>(sections[0] || null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Handle section updates from settings panel
  const handleSectionChange = (sectionId: string, updates: { variant?: string; data?: any; colorScheme?: ColorScheme }) => {
    setSections(prev => 
      prev.map(section => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          variant: updates.variant ?? section.variant,
          data: updates.data ?? section.data,
          colorScheme: updates.colorScheme ?? section.colorScheme,
        }
      })
    )
    
    // Update active section if it's the one being edited
    if (activeSection?.id === sectionId) {
      setActiveSection(prev => prev ? {
        ...prev,
        variant: updates.variant ?? prev.variant,
        data: updates.data ?? prev.data,
        colorScheme: updates.colorScheme ?? prev.colorScheme,
      } : null)
    }
  }

  // Update sections when site.config changes
  useEffect(() => {
    const newSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
      ? config.sections 
      : (initialSections && initialSections.length > 0 ? initialSections : testSections)
    
    if (newSections.length > 0) {
      setSections(newSections)
      // Set first section as active initially
      if (newSections.length > 0 && !activeSection) {
        setActiveSection(newSections[0])
      }
    }
  }, [config, initialSections])

  // Register section refs
  const registerSectionRef = (sectionId: string, element: HTMLDivElement | null) => {
    if (element) {
      sectionRefs.current.set(sectionId, element)
    } else {
      sectionRefs.current.delete(sectionId)
    }
  }

  // Scroll detection for active section
  useEffect(() => {
    const handleScroll = () => {
      const detectionPoint = window.scrollY + window.innerHeight * 0.5
      
      let activeSectionId: string | null = null
      let minDistance = Infinity
      
      // Find the section closest to the detection point
      for (const [id, element] of sectionRefs.current.entries()) {
        const rect = element.getBoundingClientRect()
        const elementTop = window.scrollY + rect.top
        const elementBottom = elementTop + rect.height
        const elementCenter = elementTop + rect.height / 2
        
        // Check if detection point is within this section
        if (detectionPoint >= elementTop && detectionPoint <= elementBottom) {
          const distance = Math.abs(detectionPoint - elementCenter)
          if (distance < minDistance) {
            minDistance = distance
            activeSectionId = id
          }
        }
      }
      
      if (activeSectionId) {
        const section = sections.find(s => s.id === activeSectionId)
        if (section && section.id !== activeSection?.id) {
          setActiveSection(section)
        }
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections, activeSection])

  const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]
  const primaryFont = theme?.fontFamily || 'Inter'

  // If no sections, show a placeholder message
  if (!sections || sections.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '3rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '600px'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
            {site.title}
          </h1>
          <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>
            Site is working! 🎉
          </p>
          <div style={{ fontSize: '0.875rem', color: '#888' }}>
            <p>Slug: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.slug}</code></p>
            <p>Status: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.status}</code></p>
            <p>Domain: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.domain}</code></p>
            <p>Password Protected: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.password_protected ? 'Yes' : 'No'}</code></p>
            <p>Has Config: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{config ? 'Yes' : 'No'}</code></p>
            <p>Sections: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{sections?.length || 0}</code></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <FontLoader fonts={fonts} />
      <FontTransition font={primaryFont}>
        <div style={{ fontFamily: theme?.fontFamily, backgroundColor: theme?.backgroundColor, color: theme?.textColor }}>
          {sections?.map((section: Section) => (
            <div
              key={section.id}
              ref={(el) => {
                const sectionElement = el as HTMLDivElement | null
                registerSectionRef(section.id, sectionElement)
              }}
            >
              <SectionRenderer section={section} theme={theme} colorScheme={section.colorScheme || 'light'} />
            </div>
          ))}
        </div>
        <FloatingCTAButton type={ctaType} value={ctaValue} colorScheme={sections?.[0]?.colorScheme || 'light'} />
        {canEdit && <SectionMorphingIndicator activeSection={activeSection} onSectionChange={handleSectionChange} />}
      </FontTransition>
    </>
  )
}
