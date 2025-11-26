'use client'

import Image from 'next/image'
import { SectionComponentProps, GallerySectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'

/**
 * GalleryGrid - Grid layout for property photos
 */
export function GalleryGrid({ data, theme }: SectionComponentProps<GallerySectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, images } = data

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {title && (
          <h2 
            className={`text-2xl md:text-3xl font-semibold text-center mb-12 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
            style={{ 
              color: theme?.textColor,
              fontFamily: headingFont,
            }}
          >
            {title}
          </h2>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div 
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
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
          ))}
        </div>
      </div>
    </section>
  )
}

