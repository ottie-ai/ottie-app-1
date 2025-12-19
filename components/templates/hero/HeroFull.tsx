'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { SectionComponentProps, HeroSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { EditableText } from '@/components/ui/editable-text'
import { WordReveal } from '@/components/ui/word-reveal'
import { SEOHeading } from '@/components/ui/seo-heading'
import { scrollSpringConfig } from '@/hooks/useScrollAnimation'
import { getFontWeight } from '@/lib/fonts'
import { getTextCaseClass, applyTextCase } from '@/lib/text-case'

/**
 * HeroFull - Full-screen cinematic hero with large centered title
 * Inspired by luxury real estate and editorial design
 */
export function HeroFull({ data, theme, colorScheme = 'light', onDataChange }: SectionComponentProps<HeroSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const fontWeight = getFontWeight(theme?.headingFontFamily || '')
  const sectionRef = useRef<HTMLElement>(null)
  
  const {
    headline,
    subheadline,
    propertyImage,
  } = data

  // Use propertyImage for hero image
  const imageUrl = propertyImage

  // Scroll progress for this section with smooth spring
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  })
  
  // Apply spring to scroll progress for momentum effect (uses global config)
  const smoothProgress = useSpring(scrollYProgress, scrollSpringConfig)

  // Background parallax - moves up slower
  const backgroundY = useTransform(smoothProgress, [0, 1], ['0%', '30%'])
  
  // Title transforms - shrinks and moves to top center
  const titleScale = useTransform(smoothProgress, [0, 0.5], [1, 0.15])
  const titleY = useTransform(smoothProgress, [0, 0.5], ['0%', '-180%'])
  const titleOpacity = useTransform(smoothProgress, [0.4, 0.6], [1, 0])
  
  // Subtitle transforms - fades out and moves up
  const subtitleY = useTransform(smoothProgress, [0, 0.3], ['0px', '-50px'])
  const subtitleOpacity = useTransform(smoothProgress, [0, 0.25], [1, 0])
  
  // Scroll indicator - fades out quickly
  const scrollIndicatorOpacity = useTransform(smoothProgress, [0, 0.1], [1, 0])

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      {/* Background Image with Parallax */}
      {imageUrl ? (
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y: backgroundY }}
        >
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Subtle gradient overlay for text readability */}
          <div className="absolute inset-0 bg-black/30" />
        </motion.div>
      ) : (
        <div 
          className="absolute inset-0 z-0" 
          style={{ backgroundColor: '#e5e5e5' }}
        />
      )}

      {/* Large Title - transforms on scroll */}
      {headline && (
        <motion.div 
          className="absolute inset-x-0 top-[20%] md:top-[25%] z-10 flex justify-center items-center pointer-events-none px-[5%]"
          style={{ 
            scale: titleScale,
            y: titleY,
            opacity: titleOpacity,
          }}
        >
          {onDataChange ? (
            <div className="pointer-events-auto w-full flex justify-center">
              <EditableText
                value={headline}
                onChange={(value) => onDataChange({ ...data, headline: value })}
                label="Edit Title"
                description="Update the main title text."
              >
                <SEOHeading
                  level={1}
                  text={headline}
                  className={`text-center max-w-[70%] text-white leading-[0.9] text-[clamp(3rem,8vw,12rem)] ${getTextCaseClass(theme?.titleCase)}`}
                  style={{ 
                    fontFamily: headingFont,
                    fontWeight: 400,
                    letterSpacing: `${theme?.headingLetterSpacing || -0.02}em`,
                    wordBreak: 'break-word',
                  }}
                >
                  <WordReveal text={applyTextCase(headline, theme?.titleCase)} delay={0.5} wordDelay={0.15} />
                </SEOHeading>
              </EditableText>
            </div>
          ) : (
            <SEOHeading
              level={1}
              text={headline}
              className={`text-center max-w-[70%] text-white leading-[0.9] text-[clamp(3rem,8vw,12rem)] ${getTextCaseClass(theme?.titleCase)}`}
              style={{ 
                fontFamily: headingFont,
                fontWeight: fontWeight,
                letterSpacing: `${theme?.headingLetterSpacing || -0.02}em`,
                wordBreak: 'break-word',
              }}
            >
              <WordReveal text={applyTextCase(headline, theme?.titleCase)} delay={0.5} wordDelay={0.15} />
            </SEOHeading>
          )}
        </motion.div>
      )}

      {/* Bottom Content - all elements aligned at same bottom level */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-10 pb-20 md:pb-12"
        style={{
          y: subtitleY,
          opacity: subtitleOpacity,
        }}
      >
        <div className="flex items-end">
          {/* Left - Description - with right padding on mobile to avoid CTA button */}
          {subheadline && (
            <div className="max-w-xl flex-1 pr-20 md:pr-0">
              {onDataChange ? (
                <EditableText
                  value={subheadline}
                  onChange={(value) => onDataChange({ ...data, subheadline: value })}
                  label="Edit Description"
                  description="Update the description text."
                >
                  <p 
                    className="text-white/80 text-base md:text-3xl leading-relaxed tracking-wide"
                    style={{ fontFamily: headingFont }}
                  >
                    <WordReveal text={subheadline} delay={0.8} wordDelay={0.03} />
                  </p>
                </EditableText>
              ) : (
                <p 
                  className="text-white/80 text-base md:text-3xl leading-relaxed tracking-wide"
                  style={{ fontFamily: headingFont }}
                >
                  <WordReveal text={subheadline} delay={0.8} wordDelay={0.03} />
                </p>
              )}
            </div>
          )}

          {/* Center - Scroll indicator - same bottom level as subtitle */}
          <motion.div 
            className="hidden md:block flex-1 text-center"
            style={{ opacity: scrollIndicatorOpacity }}
          >
            <span className="text-white/60 text-xs uppercase tracking-[0.2em] animate-word-reveal" style={{ animationDelay: '1.5s' }}>
              Scroll Down
            </span>
          </motion.div>

          {/* Right - spacer for CTA button area */}
          <div className="hidden md:block flex-1" />
        </div>
      </motion.div>
    </section>
  )
}

