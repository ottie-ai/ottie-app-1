'use client'

import Image from 'next/image'
import { SectionComponentProps, GallerySectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { cn } from '@/lib/utils'
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll'
import { getFontWeight } from '@/lib/fonts'

/**
 * GalleryGrid - Grid layout for property photos
 */
export function GalleryGrid({ data, theme, colorScheme = 'light' }: SectionComponentProps<GallerySectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const fontWeight = getFontWeight(theme?.headingFontFamily || '')
  const { title, images } = data
  const isDark = colorScheme === 'dark'

  return (
    <section className="min-h-screen bg-transparent flex items-center">
      <div className="container mx-auto px-4 py-16 md:py-24">
        {title && (
          <AnimateOnScroll animation="fade-up" delay={0.5}>
            <h2 
              className={cn(
                'text-[clamp(2rem,5vw,4rem)] text-center mb-12 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                theme?.uppercaseTitles ? 'uppercase' : ''
              )}
              style={{ 
                fontFamily: headingFont,
                fontWeight: fontWeight,
                color: isDark ? '#ffffff' : (theme?.textColor || '#111827')
              }}
            >
              {title}
            </h2>
          </AnimateOnScroll>
        )}

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4" staggerDelay={0.08} baseDelay={0.7}>
          {images.map((image, index) => (
            <StaggerItem key={index} animation="scale">
              <div 
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <Image
                  src={image.src}
                  alt={image.alt || ''}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm">{image.caption}</p>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}

