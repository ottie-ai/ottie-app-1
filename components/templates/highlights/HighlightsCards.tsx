'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { SectionComponentProps, HighlightsSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'
import { getFontWeight } from '@/lib/fonts'
import { getSectionColors } from '@/lib/section-colors'
import { SEOHeading } from '@/components/ui/seo-heading'
import { getTextCaseClass, applyTextCase } from '@/lib/text-case'
import { cn } from '@/lib/utils'
import ScrollStack, { ScrollStackItem } from '@/components/ui/ScrollStack'
import { WordReveal } from '@/components/ui/word-reveal'

/**
 * HighlightsCards - Cards layout with stacking scroll animation using reactbits ScrollStack
 * Left side: title + cards (title, text, number)
 * Right side: image (property photo)
 */
export function HighlightsCards({ data, theme, colorScheme = 'light' }: SectionComponentProps<HighlightsSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const fontWeight = getFontWeight(theme?.headingFontFamily || '')
  const { title, image, highlights } = data
  const colors = getSectionColors(colorScheme, theme)
  const animationStyle = theme?.animationStyle ?? 'word-reveal'
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [titleProgress, setTitleProgress] = useState(0) // 0 = visible, 1 = fully hidden
  const firstCardRef = useRef<HTMLDivElement | null>(null)
  
  // Trigger animation after component mounts and title section is ready
  useEffect(() => {
    // Small delay to ensure ScrollStack has initialized
    const timer = setTimeout(() => {
      setShouldAnimate(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Responsive stackPosition: higher on mobile, 15% on desktop
  const [stackPosition, setStackPosition] = useState<string>('10%')
  
  useEffect(() => {
    const updateStackPosition = () => {
      if (typeof window !== 'undefined') {
        // Mobile: 10% (higher), Desktop: 15%
        const isMobile = window.innerWidth < 768
        setStackPosition(isMobile ? '10%' : '15%')
      }
    }
    
    updateStackPosition()
    window.addEventListener('resize', updateStackPosition)
    return () => window.removeEventListener('resize', updateStackPosition)
  }, [])

  // Debug: Log highlights count
  // Scroll-linked title hide: as first card approaches 55% viewport height, title fades/blurs out
  useEffect(() => {
    let ticking = false

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        if (firstCardRef.current) {
          const rect = firstCardRef.current.getBoundingClientRect()
          const viewportHeight = window.innerHeight
          // Start fading when card top hits 70% of viewport, end at 55%
          const startPoint = viewportHeight * 0.7
          const endPoint = viewportHeight * 0.55
          const range = startPoint - endPoint || 1
          const progress = clamp((startPoint - rect.top) / range, 0, 1)
          setTitleProgress(progress)
        }
        ticking = false
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const titleSizeClass = 'text-[clamp(2.5rem,10vw,9rem)] leading-none tracking-[0.04em] whitespace-nowrap'

  return (
    <section className="relative z-30">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        {/* Title section - uses ScrollStack to be sticky at top (0%) */}
        {title && (
          <div className="relative z-[1]">
            <ScrollStack itemStackDistance={30} stackPosition="0%">
              <ScrollStackItem>
                <div 
                  className="h-screen flex items-center justify-center"
                  style={colorScheme === 'dark' ? { backgroundColor: colors.backgroundColor } : undefined}
                >
                <div
                  className={cn(
                    'w-[80vw] text-center transition-all duration-75 ease-[cubic-bezier(0.4,0,0.2,1)]'
                  )}
                  style={{
                    fontFamily: headingFont,
                    fontWeight: fontWeight,
                    transform: `translateY(${titleProgress * 8}px)`,
                    letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
                    color: colors.textColor,
                    opacity: 0.3,
                    filter: `blur(${titleProgress * 6}px)`,
                  }}
                >
                  {animationStyle === 'word-reveal' ? (
                    <SEOHeading
                      level={2}
                      text={title}
                      className={cn(
                        titleSizeClass,
                        'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                        getTextCaseClass(theme?.titleCase)
                      )}
                      style={{ fontFamily: headingFont, fontWeight: fontWeight }}
                    >
                      {/* Trigger animation after component is ready */}
                      {shouldAnimate ? (
                        <WordReveal 
                          text={applyTextCase(title, theme?.titleCase)} 
                          delay={0.5} 
                          wordDelay={0.15}
                          triggerOnScroll={false}
                        />
                      ) : (
                        <span className="opacity-0">{applyTextCase(title, theme?.titleCase)}</span>
                      )}
                    </SEOHeading>
                  ) : animationStyle === 'fade-in' || animationStyle === 'slide-up' ? (
                    <AnimateOnScroll
                      animation={animationStyle === 'fade-in' ? 'fade' : 'fade-up'}
                      delay={0.5}
                    >
                      <SEOHeading
                        level={2}
                        text={title}
                        className={cn(
                          titleSizeClass,
                          'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                          getTextCaseClass(theme?.titleCase)
                        )}
                        style={{ fontFamily: headingFont, fontWeight: fontWeight }}
                      >
                        {applyTextCase(title, theme?.titleCase)}
                      </SEOHeading>
                    </AnimateOnScroll>
                  ) : (
                    <SEOHeading
                      level={2}
                      text={title}
                      className={cn(
                        titleSizeClass,
                        'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                        getTextCaseClass(theme?.titleCase)
                      )}
                      style={{ fontFamily: headingFont, fontWeight: fontWeight }}
                    >
                      {applyTextCase(title, theme?.titleCase)}
                    </SEOHeading>
                  )}
                </div>
                </div>
              </ScrollStackItem>
            </ScrollStack>
          </div>
        )}

        {/* Cards - uses ScrollStack to stack at 10% from top */}
        {/* Cards start after title section is fully shown */}
        <div className="relative z-[10]" style={{ marginTop: title ? '0' : '0' }}>
          <ScrollStack itemStackDistance={30} stackPosition="10%">
          {highlights.map((highlight, index) => (
              <ScrollStackItem key={index}>
                <div
                  ref={index === 0 ? firstCardRef : undefined}
                  className="flex flex-col md:grid md:grid-cols-2 rounded-[20px] md:rounded-[40px] border border-black/5 h-auto md:h-[500px] min-h-[400px] md:min-h-[450px] w-full overflow-hidden transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{
                    backgroundColor: colors.backgroundColor,
                  }}
                >
                  {/* Left Side - Text Content */}
                  <div className="flex flex-col justify-between p-6 md:p-8 lg:p-12 h-full min-h-[400px] md:min-h-0">
                    <div>
                      {/* Title - Large, bold */}
                      <h3
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 lg:mb-8 leading-[1.1] transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        style={{
                          color: colors.textColor,
                          fontFamily: headingFont,
                          fontWeight: fontWeight,
                          transform: `scale(${theme?.headingFontSize || 1})`,
                          letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
                        }}
                      >
                        {applyTextCase(highlight.title, theme?.titleCase)}
                      </h3>

                      {/* Plus/Star icon */}
                      <div className="mb-4 md:mb-6">
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ color: colors.textColor }}
                        >
                          <path d="M12 2L13.09 8.26L19 7L14.74 12L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12L5 7L10.91 8.26L12 2Z" />
                        </svg>
                      </div>

                      {/* Text/Subtitle */}
                      <p
                        className="text-sm sm:text-base md:text-lg leading-relaxed max-w-md transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        style={{ color: colors.textColor }}
                      >
                        {highlight.text}
                      </p>
                    </div>

                    {/* Number - Very large at bottom */}
                    <div
                      className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold leading-none mt-4 md:mt-6 lg:mt-8 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      style={{ color: colors.textColor }}
                    >
                      {highlight.number}
                    </div>
                  </div>

                  {/* Right Side - Image */}
                  <div className="relative w-full h-[250px] sm:h-[300px] md:h-full order-first md:order-last">
                    {highlight.image || image ? (
                      <Image
                        src={highlight.image || image || ''}
                        alt={highlight.title || 'Property highlight'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          backgroundColor: colors.cardBg,
                          color: colors.secondaryTextColor,
                        }}
                      >
                        <svg className="w-24 h-24 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollStackItem>
          ))}
          </ScrollStack>
        </div>
      </div>
    </section>
  )
}

