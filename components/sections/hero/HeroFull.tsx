'use client'

import Image from 'next/image'
import { SectionComponentProps, HeroSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { EditableText } from '@/components/ui/editable-text'

/**
 * HeroFull - Full-screen cinematic hero with editorial layout
 * Inspired by luxury real estate and editorial design
 */
export function HeroFull({ data, theme, onDataChange }: SectionComponentProps<HeroSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  
  const {
    headline,
    subheadline,
    backgroundImage,
    propertyImage,
    price,
    address,
  } = data

  // Use backgroundImage or propertyImage
  const imageUrl = backgroundImage || propertyImage

  // Format current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      {imageUrl ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Gradient overlays for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
        </div>
      ) : (
        <div
          className="absolute inset-0 z-0 bg-background"
        />
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top - Address */}
        {address && (
          <div className="pt-8 md:pt-12 text-center">
            <p className="text-white/90 text-sm md:text-base tracking-wide">
              {address}
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Content */}
        <div className="pb-12 md:pb-16 lg:pb-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">
              {/* Left side - Date & Headline */}
              <div className="lg:max-w-[65%]">
                {/* Date & Category */}
                <div className="flex items-center gap-2 text-white/70 text-sm mb-4 md:mb-6">
                  <span>{currentDate}</span>
                  {price && (
                    <>
                      <span>·</span>
                      <span>{price}</span>
                    </>
                  )}
                </div>

                {/* Headline */}
                {onDataChange ? (
                  <EditableText
                    value={headline}
                    onChange={(value) => onDataChange({ ...data, headline: value })}
                    label="Edit Headline"
                    description="Update the main headline text."
                  >
                    <h1 
                      className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white leading-[1.1] ${theme?.uppercaseTitles ? 'uppercase' : ''} origin-left`}
                      style={{ 
                        fontFamily: headingFont,
                        transform: `scale(${theme?.headingFontSize || 1})`,
                        letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
                      }}
                    >
                      {headline}
                    </h1>
                  </EditableText>
                ) : (
                  <h1 
                    className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white leading-[1.1] ${theme?.uppercaseTitles ? 'uppercase' : ''} origin-left`}
                    style={{ 
                      fontFamily: headingFont,
                      transform: `scale(${theme?.headingFontSize || 1})`,
                      letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
                    }}
                  >
                    {headline}
                  </h1>
                )}
              </div>

              {/* Right side - Description */}
              {subheadline && (
                <div className="lg:max-w-[320px] lg:pb-2">
                  {onDataChange ? (
                    <EditableText
                      value={subheadline}
                      onChange={(value) => onDataChange({ ...data, subheadline: value })}
                      label="Edit Description"
                      description="Update the description text."
                    >
                      <p className="text-white/80 text-sm md:text-base leading-relaxed">
                        {subheadline}
                      </p>
                    </EditableText>
                  ) : (
                    <p className="text-white/80 text-sm md:text-base leading-relaxed">
                      {subheadline}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

