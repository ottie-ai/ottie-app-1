'use client'

import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import { SectionComponentProps, HighlightsSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { getSectionColors } from '@/lib/section-colors'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugin only on client side
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
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
  const highlightRefs = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs = useRef<(HTMLDivElement | null)[]>([])
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([])

  // GSAP ScrollTrigger setup
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!sectionRef.current || !imageWrapperRef.current || !timelineRef.current) return

    // Wait for refs to be populated
    let ctx: gsap.Context | null = null
    const timeoutId = setTimeout(() => {
      ctx = gsap.context(() => {
        // Pin the image wrapper (image is already centered via CSS absolute positioning)
        // Use timeline height to determine end point
        const timelineHeight = timelineRef.current?.offsetHeight || 0
        ScrollTrigger.create({
          trigger: imageWrapperRef.current,
          start: 'top top',
          end: () => `+=${timelineHeight}`,
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
          const title = titleRefs.current[index]
          const currentImage = imageRefs.current[index]

          // Create a timeline for each highlight
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: highlight,
              start: 'top center',
              end: 'bottom center',
              toggleActions: 'play none none reverse',
            }
          })

          // Animate dot
          if (dot) {
            tl.to(dot, {
              backgroundColor: colors.textColor,
              borderColor: colors.backgroundColor,
              duration: 0.3,
              ease: 'power2.out',
            }, 0)
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

  return (
    <section
      ref={sectionRef}
      className="w-full py-16 md:py-24 relative"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      <div className="site-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
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
                const highlightImage = highlight.image || image
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
                    {highlightImage ? (
                      <Image
                        src={highlightImage}
                        alt={highlight.title || `Property highlight ${index + 1}`}
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
          <div ref={timelineRef} className="relative">
            {/* Vertical Line (background) */}
            <div
              className="absolute left-0 w-px hidden md:block"
              style={{
                backgroundColor: colors.borderColor,
                top: 'calc(1.5rem + 10px)', // Align with first dot center
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

            <div className="pl-8 md:pl-12">
              {highlights.map((highlight, index) => {
                return (
                  <div
                    key={index}
                    ref={(el) => { highlightRefs.current[index] = el }}
                    data-highlight-item
                    className="relative"
                    style={{
                      minHeight: '40vh',
                      paddingBottom: index < highlights.length - 1 ? '40vh' : '0',
                    }}
                  >
                    {/* Dot */}
                    <div
                      ref={(el) => { dotRefs.current[index] = el }}
                      className="absolute -left-[31.5px] md:-left-[47.5px] top-6 w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: colors.backgroundColor,
                        border: `2px solid ${colors.borderColor}`,
                        transform: 'translateY(calc(-50% + 16px))',
                        fontSize: '24px',
                        marginLeft: '-6px', // Half of dot width (12px / 2 = 6px)
                      }}
                    />

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


