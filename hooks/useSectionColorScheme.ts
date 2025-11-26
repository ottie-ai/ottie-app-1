'use client'

import { useEffect, useState, useCallback, RefObject } from 'react'
import { ColorScheme, Section } from '@/types/builder'

interface UseSectionColorSchemeOptions {
  sections: Section[]
  /** Threshold for when a section is considered "active" (0-1, default 0.5) */
  threshold?: number
}

interface UseSectionColorSchemeReturn {
  /** Current active color scheme based on scroll position */
  currentColorScheme: ColorScheme
  /** ID of the currently active section */
  activeSectionId: string | null
  /** Register a section element for tracking */
  registerSection: (id: string, element: HTMLElement | null) => void
}

/**
 * Hook to detect which section is currently in view and return its color scheme
 * Updates smoothly as user scrolls between sections
 */
export function useSectionColorScheme({
  sections,
  threshold = 0.5,
}: UseSectionColorSchemeOptions): UseSectionColorSchemeReturn {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(sections[0]?.id || null)
  const [sectionElements, setSectionElements] = useState<Map<string, HTMLElement>>(new Map())

  const registerSection = useCallback((id: string, element: HTMLElement | null) => {
    setSectionElements(prev => {
      const next = new Map(prev)
      if (element) {
        next.set(id, element)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const viewportHeight = window.innerHeight
      const scrollY = window.scrollY
      const viewportCenter = scrollY + viewportHeight * threshold

      let closestSection: string | null = null
      let closestDistance = Infinity

      sectionElements.forEach((element, id) => {
        const rect = element.getBoundingClientRect()
        const elementTop = scrollY + rect.top
        const elementBottom = elementTop + rect.height
        const elementCenter = elementTop + rect.height / 2

        // Check if viewport center is within this section
        if (viewportCenter >= elementTop && viewportCenter <= elementBottom) {
          const distance = Math.abs(viewportCenter - elementCenter)
          if (distance < closestDistance) {
            closestDistance = distance
            closestSection = id
          }
        }
      })

      if (closestSection && closestSection !== activeSectionId) {
        setActiveSectionId(closestSection)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [sectionElements, activeSectionId, threshold])

  // Get the color scheme for the active section
  const activeSection = sections.find(s => s.id === activeSectionId)
  const currentColorScheme: ColorScheme = activeSection?.colorScheme || 'light'

  return {
    currentColorScheme,
    activeSectionId,
    registerSection,
  }
}

