'use client'

import { SectionComponentProps, ContactSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Envelope, MapPin } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'
import { getFontWeight } from '@/lib/fonts'
import { getSectionColors, getPrimaryColor } from '@/lib/section-colors'

/**
 * ContactSimple - Simple contact form section
 */
export function ContactSimple({ data, theme, colorScheme = 'light' }: SectionComponentProps<ContactSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const fontWeight = getFontWeight(theme?.headingFontFamily || '')
  const { title, subtitle, showForm, address, phone, email } = data
  const colors = getSectionColors(colorScheme, theme)
  const primaryColor = getPrimaryColor(theme, colorScheme)
  const isDark = colorScheme === 'dark'

  return (
    <section 
      className="min-h-screen flex items-center"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      <div className="container mx-auto px-4 py-16 md:py-24">
        <AnimateOnScroll animation="fade-up" delay={0.5}>
          <div className="max-w-2xl mx-auto text-center mb-12">
            {title && (
              <h2 
                className={cn(
                  'text-[clamp(2rem,5vw,4rem)] mb-4 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  theme?.uppercaseTitles ? 'uppercase' : ''
                )}
                style={{ 
                  fontFamily: headingFont,
                  fontWeight: fontWeight,
                  color: colors.textColor
                }}
              >
                {title}
              </h2>
            )}
            
            {subtitle && (
              <p 
                className="text-lg transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ color: colors.secondaryTextColor }}
              >{subtitle}</p>
            )}
          </div>
        </AnimateOnScroll>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <AnimateOnScroll animation="fade-right" delay={0.6} className="space-y-6">
              <h3 
                className="text-lg font-medium mb-4 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ color: colors.textColor }}
              >Get in Touch</h3>
              
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin 
                    className="size-5 flex-shrink-0 mt-0.5 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ color: colors.secondaryTextColor }}
                    weight="light" 
                  />
                  <p 
                    className="transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ color: colors.secondaryTextColor }}
                  >{address}</p>
                </div>
              )}
              
              {phone && (
                <div className="flex items-center gap-3">
                  <Phone 
                    className="size-5 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ color: colors.secondaryTextColor }}
                    weight="light" 
                  />
                  <a 
                    href={`tel:${phone}`} 
                    className="transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ color: colors.secondaryTextColor }}
                  >
                    {phone}
                  </a>
                </div>
              )}
              
              {email && (
                <div className="flex items-center gap-3">
                  <Envelope 
                    className="size-5 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ color: colors.secondaryTextColor }}
                    weight="light" 
                  />
                  <a 
                    href={`mailto:${email}`} 
                    className="transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ color: colors.secondaryTextColor }}
                  >
                    {email}
                  </a>
                </div>
              )}
            </AnimateOnScroll>

            {/* Contact Form */}
            {showForm && (
              <AnimateOnScroll animation="fade-left" delay={0.7} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    placeholder="First Name" 
                    className="transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textColor,
                    }}
                  />
                  <Input 
                    placeholder="Last Name" 
                    className="transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textColor,
                    }}
                  />
                </div>
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  className="transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.textColor,
                  }}
                />
                <Input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.textColor,
                  }}
                />
                <Textarea 
                  placeholder="Your Message" 
                  className="min-h-[120px] transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.textColor,
                  }}
                />
                <Button 
                  className="w-full transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{
                    backgroundColor: isDark ? '#ffffff' : (primaryColor || '#000000'),
                    color: isDark ? '#000000' : '#ffffff'
                  }}
                >
                  Send Message
                </Button>
              </AnimateOnScroll>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

