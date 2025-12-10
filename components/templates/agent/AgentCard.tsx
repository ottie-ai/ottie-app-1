'use client'

import Image from 'next/image'
import { SectionComponentProps, AgentSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { Phone, Envelope } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'
import { getFontWeight } from '@/lib/fonts'

/**
 * AgentCard - Card layout for agent information
 */
export function AgentCard({ data, theme, colorScheme = 'light' }: SectionComponentProps<AgentSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const fontWeight = getFontWeight(theme?.headingFontFamily || '')
  const { name, title, photo, bio, phone, email, company, license } = data
  const isDark = colorScheme === 'dark'

  return (
    <section className="min-h-screen bg-transparent flex items-center">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Agent Photo */}
            {photo && (
              <AnimateOnScroll animation="fade-right" delay={0.5}>
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden flex-shrink-0">
                  <Image
                    src={photo}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 192px, 256px"
                  />
                </div>
              </AnimateOnScroll>
            )}

            {/* Agent Info */}
            <AnimateOnScroll animation="fade-left" delay={0.6} className="flex-1 text-center md:text-left">
              <h2 
                className={cn(
                  'text-[clamp(2rem,5vw,4rem)] mb-2 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  theme?.uppercaseTitles ? 'uppercase' : ''
                )}
                style={{ 
                  fontFamily: headingFont,
                  fontWeight: fontWeight,
                  color: isDark ? '#ffffff' : (theme?.textColor || '#111827')
                }}
              >
                {name}
              </h2>
              
              {title && (
                <p 
                  className="text-lg mb-1 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#6b7280' }}
                >{title}</p>
              )}
              
              {company && (
                <p 
                  className="mb-4 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }}
                >{company}</p>
              )}

              {bio && (
                <p 
                  className="mb-6 leading-relaxed transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#6b7280' }}
                >{bio}</p>
              )}

              {/* Contact Info */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                {phone && (
                  <a 
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 text-sm transition-colors"
                    style={{ 
                      color: isDark ? 'rgba(255,255,255,0.8)' : (theme?.primaryColor || '#3b82f6')
                    }}
                    onMouseEnter={(e) => {
                      if (isDark) {
                        e.currentTarget.style.color = '#ffffff'
                      } else {
                        e.currentTarget.style.color = theme?.primaryColor || '#2563eb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.8)' : (theme?.primaryColor || '#3b82f6')
                    }}
                  >
                    <Phone className="size-4" weight="light" />
                    {phone}
                  </a>
                )}
                {email && (
                  <a 
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-2 text-sm transition-colors"
                    style={{ 
                      color: isDark ? 'rgba(255,255,255,0.8)' : (theme?.primaryColor || '#3b82f6')
                    }}
                    onMouseEnter={(e) => {
                      if (isDark) {
                        e.currentTarget.style.color = '#ffffff'
                      } else {
                        e.currentTarget.style.color = theme?.primaryColor || '#2563eb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.8)' : (theme?.primaryColor || '#3b82f6')
                    }}
                  >
                    <Envelope className="size-4" weight="light" />
                    {email}
                  </a>
                )}
              </div>

              {license && (
                <p 
                  className="text-xs mt-4 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}
                >{license}</p>
              )}
            </AnimateOnScroll>
          </div>
        </div>
      </div>
    </section>
  )
}

