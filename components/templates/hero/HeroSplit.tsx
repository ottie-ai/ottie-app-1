'use client'

import Image from 'next/image'
import { SectionComponentProps, HeroSectionData } from '@/types/builder'
import { Button } from '@/components/ui/button'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { EditableText } from '@/components/ui/editable-text'
import { SEOHeading } from '@/components/ui/seo-heading'
import { getSectionColors } from '@/lib/section-colors'
import { getTextCaseClass, applyTextCase } from '@/lib/text-case'

/**
 * HeroSplit - Split layout hero with content on left, image on right
 */
export function HeroSplit({ data, theme, colorScheme = 'light', onDataChange }: SectionComponentProps<HeroSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const colors = getSectionColors(colorScheme, theme)
  
  const {
    headline,
    subheadline,
    ctaText,
    ctaLink,
    propertyImage,
    price,
    address,
  } = data

  return (
    <section 
      className="min-h-[80vh] flex items-center pt-12"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Side */}
          <div className="space-y-6">
            {price && (
              <span 
                className="inline-block px-4 py-2 text-sm font-semibold rounded-full"
                style={theme?.primaryColor ? { 
                  backgroundColor: theme.primaryColor,
                  color: '#ffffff'
                } : { 
                  backgroundColor: '#3b82f6',
                  color: '#ffffff'
                }}
              >
                {price}
              </span>
            )}
            
            {onDataChange ? (
              <EditableText
                value={headline}
                onChange={(value) => onDataChange({ ...data, headline: value })}
                label="Edit Headline"
                description="Update the main headline text."
              >
                <SEOHeading
                  level={1}
                  text={headline}
                  className={`text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight ${getTextCaseClass(theme?.titleCase)} origin-left`}
                  style={{ 
                    color: colors.textColor,
                    fontFamily: headingFont,
                    transform: `scale(${theme?.headingFontSize || 1})`,
                    letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
                  }}
                >
                  {applyTextCase(headline, theme?.titleCase)}
                </SEOHeading>
              </EditableText>
            ) : (
            <SEOHeading
              level={1}
              text={headline}
              className={`text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight ${getTextCaseClass(theme?.titleCase)} origin-left`}
              style={{ 
                color: colors.textColor,
                fontFamily: headingFont,
                transform: `scale(${theme?.headingFontSize || 1})`,
                letterSpacing: `${theme?.headingLetterSpacing || 0}em`,
              }}
            >
              {applyTextCase(headline, theme?.titleCase)}
            </SEOHeading>
            )}
            
            {subheadline && (
              onDataChange ? (
                <EditableText
                  value={subheadline}
                  onChange={(value) => onDataChange({ ...data, subheadline: value })}
                  label="Edit Description"
                  description="Update the description text."
                >
                  <p 
                    className="text-lg md:text-xl opacity-80"
                    style={{ color: colors.textColor }}
                  >
                    {subheadline}
                  </p>
                </EditableText>
              ) : (
              <p 
                className="text-lg md:text-xl opacity-80"
                style={{ color: colors.textColor }}
              >
                {subheadline}
              </p>
              )
            )}
            
            {address && (
              <p 
                className="text-base opacity-60 flex items-center gap-2"
                style={{ color: colors.textColor }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
              </p>
            )}
            
            {ctaText && (
              <Button 
                size="lg"
                className="mt-4"
                style={theme?.primaryColor ? { backgroundColor: theme.primaryColor } : undefined}
                asChild={!!ctaLink}
              >
                {ctaLink ? (
                  <a href={ctaLink}>{ctaText}</a>
                ) : (
                  ctaText
                )}
              </Button>
            )}
          </div>

          {/* Image Side */}
          <div 
            className="relative aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.cardBg }}
          >
            {propertyImage ? (
              <Image
                src={propertyImage}
                alt={headline}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ color: colors.secondaryTextColor }}
              >
                <svg className="w-24 h-24 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

