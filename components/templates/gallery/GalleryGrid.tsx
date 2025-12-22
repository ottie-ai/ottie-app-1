'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { SectionComponentProps, GallerySectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { cn } from '@/lib/utils'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'
import { getSectionColors } from '@/lib/section-colors'
import { SEOHeading } from '@/components/ui/seo-heading'
import { getTextCaseClass, applyTextCase } from '@/lib/text-case'
import { SectionCursor } from '@/components/shared/section-cursor'
import { ArrowLeft, ArrowRight, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Ensure lightboxIndex is always valid when lightbox opens
  useEffect(() => {
    if (isLightboxOpen && images.length > 0) {
      if (lightboxIndex >= images.length) {
        setLightboxIndex(Math.max(0, images.length - 1))
      } else if (lightboxIndex < 0) {
        setLightboxIndex(0)
      }
    }
  }, [isLightboxOpen, images.length, lightboxIndex])

  // If no images, show 4 placeholder boxes
  const displayImages: Array<{ src: string; alt?: string; caption?: string; placeholder?: boolean }> = images.length === 0 
    ? Array(4).fill(null).map(() => ({ src: '', alt: '', placeholder: true }))
    : images

  // Always show first 4 images
  const visibleImages = displayImages.slice(0, 4)
  const hasMore = images.length > 4 && images.length > 0

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

  const handleShowAllPhotos = useCallback(() => {
    // Start at 5th photo (index 4), but if there are less than 5 photos, start at 0
    setLightboxIndex(images.length > 4 ? 4 : 0)
    setIsLightboxOpen(true)
  }, [images.length])

  const handlePrevious = useCallback(() => {
    setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!isLightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, handlePrevious, handleNext])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isLightboxOpen])

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false)
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

        {/* Show All Photos Button */}
        {hasMore && (
          <div className="flex justify-center mt-16 md:mt-20">
            <button
              onClick={handleShowAllPhotos}
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
                Show All Photos
              </span>
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

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={handleCloseLightbox}
          >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onClick={handleCloseLightbox}
              className="absolute top-4 right-4 md:top-8 md:right-8 z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close lightbox"
            >
              <X weight="light" className="w-6 h-6 md:w-8 md:h-8" color="white" />
            </motion.button>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePrevious()
                  }}
                  className="absolute left-4 md:left-8 z-10 p-3 md:p-4 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Previous photo"
                >
                  <ArrowLeft weight="light" className="w-7 h-7 md:w-9 md:h-9" color="white" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNext()
                  }}
                  className="absolute right-4 md:right-8 z-10 p-3 md:p-4 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Next photo"
                >
                  <ArrowRight weight="light" className="w-7 h-7 md:w-9 md:h-9" color="white" />
                </motion.button>
              </>
            )}

            {/* Photo Counter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/60 rounded-full backdrop-blur-sm pointer-events-none"
            >
              <span
                className="text-white text-sm font-light whitespace-nowrap"
                style={{ fontFamily: headingFont }}
              >
                {lightboxIndex + 1} / {images.length}
              </span>
            </motion.div>

            {/* Image Container */}
            <div 
              className="relative w-full max-w-7xl h-[90vh] mx-auto flex items-center justify-center p-4 md:p-8 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {images[lightboxIndex] && (
                  <motion.div
                    key={lightboxIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={images[lightboxIndex].src}
                      alt={images[lightboxIndex].alt || `Photo ${lightboxIndex + 1}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority
                    />
                    {images[lightboxIndex].caption && (
                      <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 p-4 md:p-6 bg-black/60 rounded-lg backdrop-blur-sm pointer-events-none">
                        <p
                          className="text-white text-sm md:text-base font-light text-center"
                          style={{ fontFamily: headingFont }}
                        >
                          {images[lightboxIndex].caption}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

