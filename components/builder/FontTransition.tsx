'use client'

import { useState, useEffect, useRef, ReactNode, createContext, useContext } from 'react'

// Context to pass the delayed font to children
const DelayedFontContext = createContext<string | null>(null)

export function useDelayedFont(currentFont: string): string {
  const delayedFont = useContext(DelayedFontContext)
  return delayedFont ?? currentFont
}

interface FontTransitionProps {
  font: string
  children: ReactNode
  className?: string
}

/**
 * Wrapper that adds a smooth fade transition when font changes
 * Delays the font change until after fade-out animation completes
 */
export function FontTransition({ font, children, className = '' }: FontTransitionProps) {
  const [displayedFont, setDisplayedFont] = useState(font)
  const [opacity, setOpacity] = useState(1)
  const isFirstRender = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      setDisplayedFont(font)
      return
    }

    // If font changed, start transition
    if (font !== displayedFont) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Fade out
      setOpacity(0.3)
      
      // After fade out completes, update font and fade in
      timeoutRef.current = setTimeout(() => {
        setDisplayedFont(font)
        // Small delay before fading in to ensure font is loaded
        requestAnimationFrame(() => {
          setOpacity(1)
        })
      }, 180)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [font, displayedFont])

  return (
    <DelayedFontContext.Provider value={displayedFont}>
      <div 
        className={`transition-opacity duration-150 ease-out ${className}`}
        style={{ opacity }}
      >
        {children}
      </div>
    </DelayedFontContext.Provider>
  )
}
