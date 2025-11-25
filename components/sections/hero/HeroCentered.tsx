'use client'

import Image from 'next/image'
import { SectionComponentProps, HeroSectionData } from '@/types/builder'
import { Button } from '@/components/ui/button'
import { useDelayedFont } from '@/components/builder/FontTransition'

/**
 * HeroCentered - Centered layout hero with full-width background
 */
export function HeroCentered({ data, theme }: SectionComponentProps<HeroSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  
  const {
    headline,
    subheadline,
    ctaText,
    ctaLink,
    backgroundImage,
    price,
    address,
  } = data

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center">
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      
      {/* Fallback gradient background */}
      {!backgroundImage && (
        <div 
          className="absolute inset-0 z-0"
          style={{ 
            background: `linear-gradient(135deg, ${theme?.primaryColor || '#3b82f6'} 0%, ${theme?.secondaryColor || '#8b5cf6'} 100%)`
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          {price && (
            <span className="inline-block px-6 py-2 bg-white/20 backdrop-blur-sm text-white text-lg font-semibold rounded-full border border-white/30">
              {price}
            </span>
          )}
          
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-semibold text-white leading-tight"
            style={{ fontFamily: headingFont }}
          >
            {headline}
          </h1>
          
          {subheadline && (
            <p className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto">
              {subheadline}
            </p>
          )}
          
          {address && (
            <p className="text-base md:text-lg text-white/70 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {address}
            </p>
          )}
          
          {ctaText && (
            <div className="pt-4">
              <Button 
                size="lg"
                className="text-lg px-8 py-6"
                variant="secondary"
                asChild={!!ctaLink}
              >
                {ctaLink ? (
                  <a href={ctaLink}>{ctaText}</a>
                ) : (
                  ctaText
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-white/60 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  )
}

