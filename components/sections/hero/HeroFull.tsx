'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { SectionComponentProps, HeroSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { EditableText } from '@/components/ui/editable-text'
import { WordReveal } from '@/components/ui/word-reveal'

/**
 * HeroFull - Full-screen cinematic hero with large centered title
 * Inspired by luxury real estate and editorial design
 */
export function HeroFull({ data, theme, onDataChange }: SectionComponentProps<HeroSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const sectionRef = useRef<HTMLElement>(null)
  
  const {
    headline,
    subheadline,
    backgroundImage,
    propertyImage,
  } = data

  // Use backgroundImage or propertyImage
  const imageUrl = backgroundImage || propertyImage

  // Scroll progress for this section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  })

  // Background parallax - moves up slower
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  
  // Title transforms - shrinks and moves to top center
  const titleScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.15])
  const titleY = useTransform(scrollYProgress, [0, 0.5], ['0%', '-180%'])
  const titleOpacity = useTransform(scrollYProgress, [0.4, 0.6], [1, 0])
  
  // Subtitle transforms - fades out and moves down
  const subtitleY = useTransform(scrollYProgress, [0, 0.3], ['0px', '50px'])
  const subtitleOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])
  
  // Scroll indicator - fades out quickly
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])

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
        <div className="absolute inset-0 z-0 bg-background" />
      )}

      {/* Large Title - transforms on scroll */}
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
              <h1 
                className={`text-center text-[clamp(2rem,12vw,20rem)] text-white font-thin leading-[0.9] ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
                style={{ 
                  fontFamily: headingFont,
                  fontWeight: 100,
                  letterSpacing: `${theme?.headingLetterSpacing || -0.02}em`,
                }}
              >
                <WordReveal text={headline} delay={0.5} wordDelay={0.15} />
              </h1>
            </EditableText>
          </div>
        ) : (
          <h1 
            className={`text-center text-[clamp(2rem,12vw,20rem)] text-white font-thin leading-[0.9] ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
            style={{ 
              fontFamily: headingFont,
              fontWeight: 100,
              letterSpacing: `${theme?.headingLetterSpacing || -0.02}em`,
            }}
          >
            <WordReveal text={headline} delay={0.5} wordDelay={0.15} />
          </h1>
        )}
      </motion.div>

      {/* Bottom Content - fades out on scroll */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 z-20 pb-8 md:pb-12 px-6 md:px-10"
        style={{
          y: subtitleY,
          opacity: subtitleOpacity,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Left - Description */}
          <div className="max-w-xl">
            {subheadline && (
              onDataChange ? (
                <EditableText
                  value={subheadline}
                  onChange={(value) => onDataChange({ ...data, subheadline: value })}
                  label="Edit Description"
                  description="Update the description text."
                >
                  <p 
                    className="text-white/80 text-2xl md:text-3xl leading-relaxed tracking-wide"
                    style={{ fontFamily: headingFont }}
                  >
                    <WordReveal text={subheadline} delay={0.8} wordDelay={0.03} />
                  </p>
                </EditableText>
              ) : (
                <p 
                  className="text-white/80 text-2xl md:text-3xl leading-relaxed tracking-wide"
                  style={{ fontFamily: headingFont }}
                >
                  <WordReveal text={subheadline} delay={0.8} wordDelay={0.03} />
                </p>
              )
            )}
          </div>

          {/* Center - Scroll indicator */}
          <motion.div 
            className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-8"
            style={{ opacity: scrollIndicatorOpacity }}
          >
            <span className="text-white/60 text-xs uppercase tracking-[0.2em] animate-word-reveal" style={{ animationDelay: '1.5s' }}>
              Scroll Down
            </span>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

