'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { SectionComponentProps, GallerySectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { cn } from '@/lib/utils'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'
import { getSectionColors } from '@/lib/section-colors'
import { SEOHeading } from '@/components/ui/seo-heading'
import { getTextCaseClass, applyTextCase } from '@/lib/text-case'
import { SectionCursor } from '@/components/shared/section-cursor'
import { CaretDown } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * GalleryGrid - Alternating left-right gallery with scroll reveal animations
 */
export function GalleryGrid({ data, theme, colorScheme = 'light' }: SectionComponentProps<GallerySectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, images } = data
  const colors = getSectionColors(colorScheme, theme)
  const [visibleCount, setVisibleCount] = useState(4)
  const [isExpanded, setIsExpanded] = useState(false)
  const galleryRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // If no images, show 4 placeholder boxes
  const displayImages: Array<{ src: string; alt?: string; caption?: string; placeholder?: boolean }> = images.length === 0 
    ? Array(4).fill(null).map(() => ({ src: '', alt: '', placeholder: true }))
    : images

  const visibleImages = isExpanded ? displayImages : displayImages.slice(0, visibleCount)
  const hasMore = images.length > visibleCount && !isExpanded && images.length > 0

  useEffect(() => {
    if (!galleryRef.current) return
    
    // Don't create animations if we're showing placeholders
    if (images.length === 0) return

    const ctx = gsap.context(() => {
      itemRefs.current.forEach((item, index) => {
        if (!item) return

        const imageContainer = item.querySelector('.gallery-image-container')
        const imageElement = item.querySelector('.gallery-parallax-image')
        if (!imageContainer) return

        // Set initial state - hidden with clip-path
        gsap.set(imageContainer, {
          clipPath: 'inset(100% 0% 0% 0%)',
        })

        // Create scroll-triggered reveal animation
        ScrollTrigger.create({
          trigger: item,
          start: 'top 80%',
          end: 'top 30%',
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress
            gsap.to(imageContainer, {
              clipPath: `inset(${100 - progress * 100}% 0% 0% 0%)`,
              duration: 0.1,
              ease: 'none',
            })
          },
        })

        // Parallax effect - image moves within its container
        if (imageElement) {
          gsap.fromTo(
            imageElement,
            {
              y: '-10%',
            },
            {
              y: '10%',
              ease: 'none',
              scrollTrigger: {
                trigger: item,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
                invalidateOnRefresh: true,
              },
            }
          )
        }
      })
    }, galleryRef)

    return () => ctx.revert()
  }, [visibleImages.length, images.length])

  // Refresh ScrollTrigger when images are expanded
  useEffect(() => {
    if (isExpanded) {
      // Wait for DOM to update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh()
        })
      })
    }
  }, [isExpanded])

  const handleLoadMore = () => {
    setIsExpanded(true)
  }

  return (
    <section 
      ref={galleryRef}
      className="w-full py-20 md:py-32"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      <div className="container mx-auto px-4 md:px-8">
        {/* Section Cursor - dynamically loads only the needed cursor style */}
        <SectionCursor 
          targetSelector="[data-gallery-image]" 
          theme={theme}
          icon="arrow"
        />
        
        {/* Alternating Gallery Grid */}
        <div className="space-y-8 md:space-y-12">
          {visibleImages.map((image, index) => {
            const isLeft = index % 2 === 0
            
            return (
              <div
                key={index}
                ref={(el) => { itemRefs.current[index] = el }}
                className={cn(
                  'w-full flex',
                  isLeft ? 'justify-start md:justify-start' : 'justify-end md:justify-end'
                )}
              >
                <div 
                  className={cn(
                    'relative w-full md:w-[70%] aspect-[4/3] overflow-hidden group',
                    isLeft ? 'md:mr-auto' : 'md:ml-auto'
                  )}
                  data-gallery-image
                >
                  <div 
                    className="gallery-image-container w-full h-full"
                    style={image.placeholder ? { clipPath: 'none' } : undefined}
                  >
                    {image.placeholder ? (
                      <div 
                        className="w-full h-full"
                        style={{ backgroundColor: '#e5e5e5' }}
                      />
                    ) : (
                      <>
                        <div className="gallery-parallax-image absolute inset-0 scale-110">
                          <Image
                            src={image.src}
                            alt={image.alt || ''}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 70vw"
                            priority={index < 2}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 pointer-events-none z-10" />
                        {image.caption && (
                          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20">
                            <p 
                              className="text-white text-sm md:text-base font-light"
                              style={{ fontFamily: headingFont }}
                            >
                              {image.caption}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-16 md:mt-20">
            <button
              onClick={handleLoadMore}
              className={cn(
                'group relative px-8 py-4 rounded-full border transition-all duration-300',
                'hover:scale-105 active:scale-95',
                'flex items-center gap-3'
              )}
              style={{
                borderColor: colors.textColor + '40',
                color: colors.textColor,
                fontFamily: headingFont,
              }}
            >
              <span className="text-sm md:text-base font-light tracking-wide">
                Load More
              </span>
              <CaretDown 
                weight="light" 
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-1"
              />
              <div 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  backgroundColor: colors.textColor + '08',
                }}
              />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

