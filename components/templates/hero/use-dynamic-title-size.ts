'use client'

import { useEffect, useRef, useState } from 'react'

interface UseDynamicTitleSizeOptions {
  text: string
  containerWidthPercent: number // e.g., 70 for 70%
  minFontSize: number // in rem
  maxFontSize: number // in rem
  lineHeight: number // e.g., 0.9
  fontFamily?: string // Font family to use for measurement
}

/**
 * Hook to dynamically calculate font size for title text
 * Ensures text fits within maxLines while maintaining good readability
 * For short text, scales up to fill containerWidthPercent
 * Preserves word grouping for WordReveal animations
 */
export function useDynamicTitleSize({
  text,
  containerWidthPercent,
  minFontSize,
  maxFontSize,
  lineHeight,
  fontFamily,
}: UseDynamicTitleSizeOptions) {
  const [fontSize, setFontSize] = useState(maxFontSize)
  const [actualLines, setActualLines] = useState(1) // Track how many lines are actually used
  const measureRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)
  const isMeasuringRef = useRef(false) // Prevent multiple simultaneous measurements
  const lastFontSizeRef = useRef(maxFontSize) // Keep last calculated size to prevent flicker

  useEffect(() => {
    if (!measureRef.current || !textRef.current || !text.trim()) {
      setFontSize(maxFontSize)
      lastFontSizeRef.current = maxFontSize
      return
    }

    const measure = () => {
      // Skip if already measuring
      if (isMeasuringRef.current) return
      isMeasuringRef.current = true
      const container = measureRef.current
      const textElement = textRef.current
      if (!container || !textElement) return

      // Get container width (70% of viewport minus padding)
      const viewportWidth = window.innerWidth
      const padding = viewportWidth * 0.05 * 2 // 5% padding on each side
      const containerWidthPx = ((viewportWidth - padding) * containerWidthPercent) / 100

      // Get computed styles from actual element
      const computedStyle = window.getComputedStyle(textElement)
      const actualFontFamily = fontFamily || computedStyle.fontFamily
      const fontWeight = computedStyle.fontWeight
      const letterSpacing = computedStyle.letterSpacing

      // Reference width for font size calculation (1700px)
      const referenceWidth = 1700
      const minFontSizeThreshold = 9 // rem

      // First, try single line approach - scale text to fill 70% width
      const singleLineTest = document.createElement('span')
      singleLineTest.style.position = 'absolute'
      singleLineTest.style.visibility = 'hidden'
      singleLineTest.style.whiteSpace = 'nowrap'
      singleLineTest.style.fontFamily = actualFontFamily
      singleLineTest.style.fontWeight = fontWeight
      singleLineTest.style.letterSpacing = letterSpacing
      singleLineTest.style.fontSize = `${maxFontSize}rem`
      singleLineTest.textContent = text
      document.body.appendChild(singleLineTest)

      const singleLineWidthAtMax = singleLineTest.offsetWidth
      document.body.removeChild(singleLineTest)

      let bestSize = maxFontSize
      let linesNeeded = 1

      // Calculate what font size would be needed for single line at current width
      let singleLineSize = maxFontSize
      if (singleLineWidthAtMax > 0) {
        const scaleFactor = containerWidthPx / singleLineWidthAtMax
        singleLineSize = Math.min(maxFontSize, maxFontSize * scaleFactor * 0.95)
      }

      // Calculate what font size would be at reference width (1700px)
      // Scale the container width proportionally
      const referenceContainerWidth = (referenceWidth * containerWidthPercent) / 100
      const referencePadding = referenceWidth * 0.05 * 2
      const referenceContainerWidthPx = ((referenceWidth - referencePadding) * containerWidthPercent) / 100
      
      // Calculate font size at reference width
      let fontSizeAtReferenceWidth = singleLineSize
      if (singleLineWidthAtMax > 0) {
        const referenceScaleFactor = referenceContainerWidthPx / singleLineWidthAtMax
        fontSizeAtReferenceWidth = Math.min(maxFontSize, maxFontSize * referenceScaleFactor * 0.95)
      }

      // If font size at 1700px would be less than 9rem, use 2 lines instead
      if (fontSizeAtReferenceWidth < minFontSizeThreshold) {
        // Use 2 lines - find optimal size for 2 lines
        let low = minFontSize
        let high = maxFontSize
        const maxLines = 2

        // Binary search for optimal font size that fits in 2 lines
        for (let iteration = 0; iteration < 20; iteration++) {
          const testSize = (low + high) / 2
          
          // Create test element with this font size
          const testElement = document.createElement('div')
          testElement.style.position = 'absolute'
          testElement.style.visibility = 'hidden'
          testElement.style.width = `${containerWidthPx}px`
          testElement.style.fontFamily = actualFontFamily
          testElement.style.fontWeight = fontWeight
          testElement.style.letterSpacing = letterSpacing
          testElement.style.fontSize = `${testSize}rem`
          testElement.style.lineHeight = `${lineHeight}`
          testElement.style.wordBreak = 'break-word'
          testElement.style.whiteSpace = 'normal'
          testElement.textContent = text
          document.body.appendChild(testElement)

          // Force layout calculation
          testElement.offsetHeight

          const testHeight = testElement.offsetHeight
          const singleLineHeight = testSize * lineHeight * 16 // Convert rem to px (assuming 16px base)
          const maxAllowedHeight = singleLineHeight * maxLines * 1.05 // 1.05 for some tolerance

          // Calculate actual lines used
          const actualLinesUsed = Math.ceil(testHeight / singleLineHeight)

          document.body.removeChild(testElement)

          if (testHeight <= maxAllowedHeight) {
            // Fits in maxLines, can try larger
            bestSize = testSize
            linesNeeded = actualLinesUsed
            low = testSize
          } else {
            // Too big, need smaller
            high = testSize
          }

          // Early exit if we're close enough
          if (high - low < 0.1) break
        }
      } else {
        // Single line is fine - use calculated size
        bestSize = singleLineSize
        linesNeeded = 1
      }

      const newSize = Math.max(minFontSize, Math.min(maxFontSize, bestSize))
      
      // Only update if size actually changed (to prevent flicker)
      if (Math.abs(newSize - lastFontSizeRef.current) > 0.1) {
        setFontSize(newSize)
        lastFontSizeRef.current = newSize
      }
      setActualLines(linesNeeded)
      isMeasuringRef.current = false
    }

    // Wait for fonts to load before measuring
    // Check if font is loaded using document.fonts API
    const waitForFont = async () => {
      if (fontFamily && document.fonts && document.fonts.check) {
        // Wait for font to be loaded (with timeout)
        const fontLoaded = new Promise<void>((resolve) => {
          let attempts = 0
          const maxAttempts = 50 // 5 seconds max wait
          
          const checkFont = () => {
            attempts++
            // Check if font is loaded (try with different weights)
            const isLoaded = document.fonts.check(`1em ${fontFamily}`) || 
                           document.fonts.check(`400 1em ${fontFamily}`) ||
                           document.fonts.check(`500 1em ${fontFamily}`)
            
            if (isLoaded || attempts >= maxAttempts) {
              resolve()
            } else {
              setTimeout(checkFont, 100)
            }
          }
          
          checkFont()
        })
        
        await fontLoaded
      }
      
      // Additional delay to ensure layout is settled
      setTimeout(() => {
        measure()
      }, 150)
    }
    
    const timeoutId = setTimeout(waitForFont, 0)

    // Re-measure on resize (with debounce)
    let resizeTimeout: NodeJS.Timeout | null = null
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        if (!isMeasuringRef.current) {
          measure()
        }
      }, 150)
    }
    
    const resizeObserver = new ResizeObserver(handleResize)
    
    if (measureRef.current) {
      resizeObserver.observe(measureRef.current)
    }

    // Also listen to window resize
    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timeoutId)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      isMeasuringRef.current = false
    }
  }, [text, containerWidthPercent, minFontSize, maxFontSize, lineHeight, fontFamily])

  return {
    fontSize: `${fontSize}rem`,
    actualLines,
    measureRef,
    textRef,
  }
}








