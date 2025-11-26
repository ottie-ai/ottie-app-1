'use client'

import { SectionComponentProps, ContactSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Envelope, MapPin } from '@phosphor-icons/react'

/**
 * ContactSimple - Simple contact form section
 */
export function ContactSimple({ data, theme }: SectionComponentProps<ContactSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { title, subtitle, showForm, address, phone, email } = data

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-12">
          {title && (
            <h2 
              className={`text-2xl md:text-3xl font-semibold mb-4 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
              style={{ 
                color: theme?.textColor,
                fontFamily: headingFont,
              }}
            >
              {title}
            </h2>
          )}
          
          {subtitle && (
            <p className="text-muted-foreground text-lg">{subtitle}</p>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium mb-4">Get in Touch</h3>
              
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" weight="fill" />
                  <p className="text-muted-foreground">{address}</p>
                </div>
              )}
              
              {phone && (
                <div className="flex items-center gap-3">
                  <Phone className="size-5 text-muted-foreground" weight="fill" />
                  <a href={`tel:${phone}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    {phone}
                  </a>
                </div>
              )}
              
              {email && (
                <div className="flex items-center gap-3">
                  <Envelope className="size-5 text-muted-foreground" weight="fill" />
                  <a href={`mailto:${email}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    {email}
                  </a>
                </div>
              )}
            </div>

            {/* Contact Form */}
            {showForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="First Name" />
                  <Input placeholder="Last Name" />
                </div>
                <Input type="email" placeholder="Email Address" />
                <Input type="tel" placeholder="Phone Number" />
                <Textarea placeholder="Your Message" className="min-h-[120px]" />
                <Button className="w-full">Send Message</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

