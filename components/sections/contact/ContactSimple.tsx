'use client'

import { SectionComponentProps, ContactSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Envelope, MapPin } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'

/**
 * ContactSimple - Simple contact form section
 */
export function ContactSimple({ data, theme, colorScheme = 'light' }: SectionComponentProps<ContactSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, subtitle, showForm, address, phone, email } = data
  const isDark = colorScheme === 'dark'

  return (
    <section className="min-h-screen bg-transparent flex items-center">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <AnimateOnScroll animation="fade-up" delay={0.5}>
          <div className="max-w-2xl mx-auto text-center mb-12">
            {title && (
              <h2 
                className={cn(
                  'text-2xl md:text-3xl font-semibold mb-4 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  theme?.uppercaseTitles ? 'uppercase' : '',
                  isDark ? 'text-white' : 'text-foreground'
                )}
                style={{ 
                  fontFamily: headingFont,
                }}
              >
                {title}
              </h2>
            )}
            
            {subtitle && (
              <p className={cn(
                'text-lg transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                isDark ? 'text-white/70' : 'text-muted-foreground'
              )}>{subtitle}</p>
            )}
          </div>
        </AnimateOnScroll>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <AnimateOnScroll animation="fade-right" delay={0.6} className="space-y-6">
              <h3 className={cn(
                'text-lg font-medium mb-4 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                isDark ? 'text-white' : 'text-foreground'
              )}>Get in Touch</h3>
              
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className={cn(
                    'size-5 flex-shrink-0 mt-0.5 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'text-white/60' : 'text-muted-foreground'
                  )} weight="fill" />
                  <p className={cn(
                    'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'text-white/70' : 'text-muted-foreground'
                  )}>{address}</p>
                </div>
              )}
              
              {phone && (
                <div className="flex items-center gap-3">
                  <Phone className={cn(
                    'size-5 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'text-white/60' : 'text-muted-foreground'
                  )} weight="fill" />
                  <a href={`tel:${phone}`} className={cn(
                    'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'
                  )}>
                    {phone}
                  </a>
                </div>
              )}
              
              {email && (
                <div className="flex items-center gap-3">
                  <Envelope className={cn(
                    'size-5 transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'text-white/60' : 'text-muted-foreground'
                  )} weight="fill" />
                  <a href={`mailto:${email}`} className={cn(
                    'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'
                  )}>
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
                    className={cn(
                      'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                      isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' : ''
                    )}
                  />
                  <Input 
                    placeholder="Last Name" 
                    className={cn(
                      'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                      isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' : ''
                    )}
                  />
                </div>
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  className={cn(
                    'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' : ''
                  )}
                />
                <Input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className={cn(
                    'transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' : ''
                  )}
                />
                <Textarea 
                  placeholder="Your Message" 
                  className={cn(
                    'min-h-[120px] transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' : ''
                  )}
                />
                <Button 
                  className={cn(
                    'w-full transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isDark ? 'bg-white text-black hover:bg-white/90' : ''
                  )}
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

