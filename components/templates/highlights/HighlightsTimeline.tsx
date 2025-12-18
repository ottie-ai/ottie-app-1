'use client'

import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import { SectionComponentProps, HighlightsSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { getSectionColors } from '@/lib/section-colors'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as PhosphorIcons from '@phosphor-icons/react'

// Register GSAP plugin only on client side
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * Get Phosphor icon component by name
 */
function getPhosphorIcon(iconName?: string) {
  if (!iconName) return null
  
  // Convert icon name to PascalCase (e.g., 'bed' -> 'Bed', 'car-simple' -> 'CarSimple')
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
  
  const IconComponent = (PhosphorIcons as any)[pascalCase]
  return IconComponent || null
}

/**
 * HighlightsTimeline - Timeline scroll layout with sticky image and animated vertical line
 * Uses GSAP ScrollTrigger for smooth pinning and scroll-linked animations
 * Left: Sticky image (centered vertically)
 * Right: List of highlights with titles, subtitles, dots, and animated vertical line
 */
export function HighlightsTimeline({ data, theme, colorScheme = 'light' }: SectionComponentProps<HighlightsSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { image, highlights } = data
  const colors = getSectionColors(colorScheme, theme)
  
  // Refs
  const sectionRef = useRef<HTMLDivElement>(null)
  const imageWrapperRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const timelineRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const lineWrapperRef = useRef<HTMLDivElement>(null)
  const highlightRefs = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs = useRef<(HTMLDivElement | null)[]>([])
  const iconRefs = useRef<(HTMLDivElement | null)[]>([])
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([])

  // GSAP ScrollTrigger setup - only on desktop
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!sectionRef.current || !imageWrapperRef.current || !timelineRef.current) return

    // Only setup GSAP on desktop (>= 768px)
    const isDesktop = window.innerWidth >= 768
    if (!isDesktop) return

    // Wait for refs to be populated
    let ctx: gsap.Context | null = null
    const timeoutId = setTimeout(() => {
      ctx = gsap.context(() => {
        // Pin the image wrapper (image is already centered via CSS absolute positioning)
        // End pinning when the last highlight reaches the center (when its dot is filled)
        const lastHighlight = highlightRefs.current[highlightRefs.current.length - 1]
        ScrollTrigger.create({
          trigger: imageWrapperRef.current,
          start: 'top top',
          endTrigger: lastHighlight || imageWrapperRef.current,
          end: lastHighlight ? 'top center' : 'bottom bottom',
          pin: imageWrapperRef.current,
          pinSpacing: true,
          anticipatePin: 0,
          invalidateOnRefresh: true,
        })

        // Calculate timeline height based on first and last dot positions
        const firstDot = dotRefs.current[0]
        const lastDot = dotRefs.current[dotRefs.current.length - 1]
        let lineHeight = 0
        if (firstDot && lastDot && timelineRef.current) {
          const timelineRect = timelineRef.current.getBoundingClientRect()
          const firstDotRect = firstDot.getBoundingClientRect()
          const lastDotRect = lastDot.getBoundingClientRect()
          
          // Calculate the center of first and last dots relative to timeline
          const firstDotCenter = firstDotRect.top + firstDotRect.height / 2 - timelineRect.top
          const lastDotCenter = lastDotRect.top + lastDotRect.height / 2 - timelineRect.top
          lineHeight = lastDotCenter - firstDotCenter
          
          // Set the CSS variable for timeline height
          timelineRef.current.style.setProperty('--timeline-height', `${lineHeight}px`)
        }

        // Animate the timeline progress line
        if (lineRef.current && lineHeight > 0 && lastDot && highlightRefs.current[0]) {
          const firstHighlight = highlightRefs.current[0]
          const lastHighlight = highlightRefs.current[highlightRefs.current.length - 1]
          
          gsap.fromTo(lineRef.current, 
            { height: '0px' },
            {
              height: `${lineHeight}px`,
              ease: 'none',
              scrollTrigger: {
                trigger: firstHighlight,
                start: 'top center',
                endTrigger: lastHighlight,
                end: 'top center',
                scrub: true,
              }
            }
          )
        }

        // Animate each highlight item
        highlightRefs.current.forEach((highlight, index) => {
          if (!highlight) return

          const dot = dotRefs.current[index]
          const icon = iconRefs.current[index]
          const title = titleRefs.current[index]
          const currentImage = imageRefs.current[index]
          const hasIcon = highlights[index]?.icon

          // Create a timeline for each highlight
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: highlight,
              start: 'top center',
              end: 'bottom center',
              toggleActions: 'play reverse play reverse',
              fastScrollEnd: true,
            }
          })

          // Animate dot with spring effect (scale up) - always
          if (dot) {
            tl.to(dot, {
              backgroundColor: colors.textColor,
              borderWidth: '0px',
              scale: 1.5,
              duration: 0.3,
              ease: 'back.out(3)', // Spring effect
            }, 0)
          }

          // Animate icon (fade in and scale) - only if icon exists
          if (icon && hasIcon) {
            tl.fromTo(icon, {
              opacity: 0,
              scale: 0,
            }, {
              opacity: 1,
              scale: 1,
              duration: 0.2,
              ease: 'back.out(2)',
            }, 0.05) // Slight delay after dot starts
          }

          // Animate title color
          if (title) {
            tl.to(title, {
              color: colors.textColor,
              duration: 0.3,
              ease: 'power2.out',
            }, 0)
          }

          // Animate image fade in/out - smooth crossfade to prevent background flashing
          if (currentImage) {
            // Find the previous image (index - 1) to fade out
            const previousImage = index > 0 ? imageRefs.current[index - 1] : null
            
            // Set current image to start at opacity 0 (it's on top due to z-index)
            gsap.set(currentImage, { opacity: 0 })
            
            if (previousImage) {
              // Crossfade: fade out previous (below) and fade in current (on top) simultaneously
              // Since current is on top with z-index, it will fade in over the previous one
              // This ensures there's always an image visible (no background flash)
              tl.to(previousImage, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.inOut',
              }, 0)
              
              tl.to(currentImage, {
                opacity: 1,
                duration: 0.8,
                ease: 'power2.inOut',
              }, 0) // Start simultaneously for smooth crossfade
            } else {
              // First image - just fade in
              tl.to(currentImage, {
                opacity: 1,
                duration: 0.8,
                ease: 'power2.inOut',
              }, 0)
            }
            
            // Hide all other images (not previous or current)
            imageRefs.current.forEach((img, imgIndex) => {
              if (img && imgIndex !== index && imgIndex !== index - 1) {
                gsap.set(img, { opacity: 0 })
              }
            })
          }
        })

      }, sectionRef)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (ctx) {
        ctx.revert()
      }
    }
  }, [highlights.length, colors.textColor, colors.backgroundColor, image])

  // Set responsive top position for timeline line and padding for highlights (desktop only)
  useEffect(() => {
    if (!lineWrapperRef.current) return
    const isDesktop = window.innerWidth >= 768
    if (!isDesktop) return

    const updateResponsiveStyles = () => {
      const isDesktop = window.innerWidth >= 768
      if (!isDesktop) return
      
      // Update line position
      if (lineWrapperRef.current) {
        lineWrapperRef.current.style.top = 'calc(10vh + 1.5rem + 10px)'
      }

      // Update highlight padding
      highlightRefs.current.forEach((highlight, index) => {
        if (highlight) {
          highlight.style.minHeight = '40vh'
          if (index < highlights.length - 1) {
            highlight.style.paddingBottom = '40vh'
          }
        }
      })
    }

    updateResponsiveStyles()
    window.addEventListener('resize', updateResponsiveStyles)
    return () => window.removeEventListener('resize', updateResponsiveStyles)
  }, [highlights.length])

  return (
    <section
      ref={sectionRef}
      className="w-full py-16 md:py-24 relative"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      <div className="site-container">
        {/* Mobile: Simple static layout */}
        <div className="md:hidden space-y-12">
          {highlights.map((highlight, index) => {
            const IconComponent = getPhosphorIcon(highlight.icon)
            return (
              <div key={index} className="space-y-4">
                {/* Image */}
                <div className="relative w-full h-[50vh] rounded-2xl overflow-hidden">
                  {highlight.image ? (
                    <Image
                      src={highlight.image}
                      alt={highlight.title || `Property highlight ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="100vw"
                      priority={index === 0}
                      loading="eager"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: '#e5e5e5',
                      }}
                    />
                  )}
                </div>
                
                {/* Content */}
                <div className="space-y-3">
                  <h3
                    className="text-3xl font-normal leading-tight"
                    style={{
                      color: colors.secondaryTextColor,
                      fontFamily: headingFont,
                    }}
                  >
                    {highlight.title}
                  </h3>
                  {highlight.text && (
                    <p
                      className="text-lg leading-relaxed"
                      style={{
                        color: colors.secondaryTextColor,
                      }}
                    >
                      {highlight.text}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: Timeline layout with pinning */}
        <div className="hidden md:grid md:grid-cols-2 gap-16">
          {/* Left Column - Sticky Image (pinned via GSAP) */}
          <div 
            ref={imageWrapperRef}
            className="relative h-screen flex items-center justify-center"
          >
            <div
              ref={imageRef}
              className="relative w-full max-w-[90%] h-[80vh] rounded-2xl overflow-hidden"
            >
              {/* Render all images - one for each highlight, plus fallback */}
              {highlights.map((highlight, index) => {
                return (
                  <div
                    key={index}
                    ref={(el) => { imageRefs.current[index] = el }}
                    className="absolute inset-0"
                    style={{
                      opacity: index === 0 ? 1 : 0, // First image visible by default
                      zIndex: index, // Higher index = on top, ensures new image fades in over previous
                    }}
                  >
                    {highlight.image ? (
                      <Image
                        src={highlight.image}
                        alt={highlight.title || `Property highlight ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={index === 0}
                        loading={index === 0 ? 'eager' : 'eager'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundColor: '#e5e5e5', // Light gray placeholder
                        }}
                      />
                    )}
                  </div>
                )
              })}
              
              {/* Fallback if no highlights or no images at all */}
              {highlights.length === 0 && image && (
                <Image
                  src={image}
                  alt="Property highlight"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )}
            </div>
          </div>

          {/* Right Column - Timeline with Highlights */}
          <div ref={timelineRef} className="relative hidden md:block">
            {/* Vertical Line (background) */}
            <div
              ref={lineWrapperRef}
              className="absolute left-0 w-px hidden md:block"
              style={{
                backgroundColor: colors.borderColor,
                top: 'calc(10vh + 1.5rem + 10px)',
                height: 'var(--timeline-height, 100%)', // Will be set dynamically
              }}
            >
              {/* Animated fill line (GSAP controlled) */}
              <div
                ref={lineRef}
                className="absolute left-0 top-0 w-full"
                style={{
                  backgroundColor: colors.textColor,
                  height: '0px',
                }}
              />
            </div>

            <div className="pl-12">
              {/* Spacer to align first highlight with centered image */}
              <div className="h-[10vh]" />
              
              {highlights.map((highlight, index) => {
                const IconComponent = getPhosphorIcon(highlight.icon)
                
                return (
                  <div
                    key={index}
                    ref={(el) => { highlightRefs.current[index] = el }}
                    data-highlight-item
                    className="relative"
                  >
                    {/* Dot with Icon */}
                    <div
                      ref={(el) => { dotRefs.current[index] = el }}
                      className="absolute -left-[47.5px] top-6 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: colors.backgroundColor,
                        border: `2px solid ${colors.borderColor}`,
                        transform: 'translateY(calc(-50% + 16px))',
                        marginLeft: '-16px', // Half of dot width (32px / 2 = 16px)
                      }}
                    >
                      {/* Icon (hidden by default, animated in) */}
                      {IconComponent && (
                        <div
                          ref={(el) => { iconRefs.current[index] = el }}
                          style={{
                            opacity: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconComponent
                            weight="light"
                            size={14}
                            color={colors.backgroundColor}
                          />
                        </div>
                      )}
                    </div>

                    {/* Number - aligned with dot */}
                    <div
                      className="absolute left-0 top-6 text-2xl font-normal"
                      style={{
                        color: colors.secondaryTextColor,
                        fontFamily: headingFont,
                        transform: 'translateY(-50%)',
                        paddingTop: '34px',
                      }}
                    >
                      {(index + 1).toString().padStart(2, '0')}
                    </div>

                    {/* Content */}
                    <div className="space-y-3 pt-20">
                      {/* Title */}
                      <h3
                        ref={(el) => { titleRefs.current[index] = el }}
                        className="text-5xl font-normal leading-tight"
                        style={{
                          color: colors.secondaryTextColor,
                          fontFamily: headingFont,
                        }}
                      >
                        {highlight.title}
                      </h3>

                      {/* Subtitle */}
                      {highlight.text && (
                        <p
                          className="text-2xl leading-relaxed"
                          style={{
                            color: colors.secondaryTextColor,
                          }}
                        >
                          {highlight.text}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


