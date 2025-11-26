'use client'

import Image from 'next/image'
import { SectionComponentProps, AgentSectionData } from '@/types/builder'
import { useDelayedFont } from '@/components/builder/FontTransition'
import { Phone, Envelope } from '@phosphor-icons/react'

/**
 * AgentCard - Card layout for agent information
 */
export function AgentCard({ data, theme }: SectionComponentProps<AgentSectionData>) {
  const headingFont = useDelayedFont(theme?.headingFontFamily || 'system-ui')
  const { name, title, photo, bio, phone, email, company, license } = data

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Agent Photo */}
            {photo && (
              <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden flex-shrink-0">
                <Image
                  src={photo}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 192px, 256px"
                />
              </div>
            )}

            {/* Agent Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 
                className={`text-2xl md:text-3xl font-semibold mb-2 ${theme?.uppercaseTitles ? 'uppercase' : ''}`}
                style={{ 
                  color: theme?.textColor,
                  fontFamily: headingFont,
                }}
              >
                {name}
              </h2>
              
              {title && (
                <p className="text-muted-foreground text-lg mb-1">{title}</p>
              )}
              
              {company && (
                <p className="text-muted-foreground mb-4">{company}</p>
              )}

              {bio && (
                <p className="text-muted-foreground mb-6 leading-relaxed">{bio}</p>
              )}

              {/* Contact Info */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                {phone && (
                  <a 
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="size-4" weight="fill" />
                    {phone}
                  </a>
                )}
                {email && (
                  <a 
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Envelope className="size-4" weight="fill" />
                    {email}
                  </a>
                )}
              </div>

              {license && (
                <p className="text-xs text-muted-foreground mt-4">{license}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

