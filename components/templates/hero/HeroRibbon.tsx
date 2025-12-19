'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowDown } from '@phosphor-icons/react'
import CurvedLoop from '@/components/CurvedLoop'
import { WordReveal } from '@/components/ui/word-reveal'
import { SectionComponentProps, HeroSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'

/**
 * HeroRibbon - Full-screen hero with property image
 * Simple ribbon-style hero section
 */
export function HeroRibbon({ data, theme, colorScheme = 'light', onDataChange }: SectionComponentProps<HeroSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  // Use direct font from theme for CurvedLoop to ensure it applies correctly
  const directHeadingFont = theme?.headingFontFamily || 'system-ui'
  
  const {
    headline,
    subheadline,
    propertyImage,
  } = data

  // Use propertyImage for hero image
  const imageUrl = propertyImage

  // Prepare text with symbol between each title for seamless loop
  const curvedText = headline ? `${headline} ✦ ` : ''

  return (
    <section className="relative h-screen w-full overflow-hidden">
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
        </div>
      ) : (
        <div 
          className="absolute inset-0 z-0" 
          style={{ backgroundColor: '#e5e5e5' }}
        />
      )}

      {/* Curved Loop in bottom third */}
      {curvedText && (
        <div 
          className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center"
          style={{ 
            height: '33.333%',
            paddingBottom: '1rem',
            fontFamily: headingFont,
          }}
        >
          <div className="relative w-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 gap-4 sm:gap-5 md:gap-6">
            {/* Title (Loop) - animácia z dola hore podľa animationStyle */}
            <motion.div 
              className="relative w-full" 
              style={{ height: 'auto', minHeight: 'auto' }}
              initial={
                theme?.animationStyle === 'none'
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 40 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: theme?.animationStyle === 'none' ? 0 : 0.2,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <CurvedLoop
                marqueeText={curvedText}
                speed={0.3}
                curveAmount={0}
                direction="left"
                interactive={false}
                className="text-white"
                fontFamily={directHeadingFont}
              />
            </motion.div>
            
            {/* Thin white line below text - animácia z ľava do prava (nakreslenie) */}
            <div className="w-full sm:w-[90%] md:w-[80%] flex flex-col gap-3 sm:gap-4">
              <motion.div 
                className="h-px bg-white origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.8,
                  delay: theme?.animationStyle === 'none' ? 0 : 0.2,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              />
              
              {/* Content below line - subtitle on left, arrow on right */}
              <div className="flex items-center justify-between gap-4">
                {/* Subtitle on left side - responsive width with reveal effect */}
                {subheadline && (
                  <motion.div 
                    className="w-full sm:w-[50%] md:w-[40%] text-white leading-relaxed" 
                    style={{ 
                      fontFamily: headingFont, 
                      fontSize: 'clamp(0.875rem, 2vw, 1.3125rem)' 
                    }}
                    initial={
                      !theme?.animationStyle || theme?.animationStyle === 'blur'
                        ? { opacity: 1 }
                        : theme?.animationStyle === 'fade-in' 
                        ? { opacity: 0 }
                        : theme?.animationStyle === 'slide-up'
                        ? { opacity: 0, y: 20 }
                        : { opacity: 1 }
                    }
                    animate={
                      theme?.animationStyle === 'fade-in' 
                        ? { opacity: 1 }
                        : theme?.animationStyle === 'slide-up'
                        ? { opacity: 1, y: 0 }
                        : { opacity: 1, y: 0 }
                    }
                    transition={{
                      duration: 0.8,
                      delay: theme?.animationStyle === 'none' ? 0 : 0.6,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    {!theme?.animationStyle || theme?.animationStyle === 'blur' ? (
                      <WordReveal text={subheadline} delay={0.6} wordDelay={0.03} />
                    ) : (
                      subheadline
                    )}
                  </motion.div>
                )}
                
                {/* Arrow down icon on right side - animated scroll indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    y: [0, 8, 0],
                  }}
                  transition={{
                    opacity: {
                      duration: 0.5,
                      delay: theme?.animationStyle === 'none' ? 0 : 0.6,
                    },
                    y: {
                      duration: 1.5,
                      delay: theme?.animationStyle === 'none' ? 0 : 1.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  }}
                  className="flex-shrink-0"
                >
                  <ArrowDown 
                    weight="light" 
                    color="#ffffff"
                    size={32}
                    className="sm:w-10 sm:h-10 md:w-12 md:h-12"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

