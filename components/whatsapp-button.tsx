'use client'

import { WhatsappLogo, Phone, Envelope } from '@phosphor-icons/react'
import { CTAType } from '@/types/builder'
import { useMagnetic } from '@/hooks/useMagnetic'

interface FloatingCTAButtonProps {
  type?: CTAType
  value?: string
}

export function FloatingCTAButton({ type = 'whatsapp', value = '' }: FloatingCTAButtonProps) {
  const magneticRef = useMagnetic<HTMLAnchorElement>({
    distance: 150,
    strength: 0.4,
  })

  if (type === 'none') return null

  const getHref = () => {
    switch (type) {
      case 'whatsapp':
        return `https://wa.me/${value.replace(/[^0-9]/g, '')}`
      case 'phone':
        return `tel:${value}`
      case 'email':
        return `mailto:${value}`
      default:
        return '#'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'whatsapp':
        return <WhatsappLogo className="size-10 text-black" weight="fill" />
      case 'phone':
        return <Phone className="size-10 text-black" weight="fill" />
      case 'email':
        return <Envelope className="size-10 text-black" weight="fill" />
      default:
        return null
    }
  }

  return (
    <div className="fixed right-6 md:right-10 bottom-6 md:bottom-10 z-50">
      <a
        ref={magneticRef}
        href={getHref()}
        target={type === 'email' ? undefined : '_blank'}
        rel={type === 'email' ? undefined : 'noopener noreferrer'}
        className="group relative flex items-center justify-center"
      >
        {/* Radio wave rings - emanating outward with equal spacing */}
        <span 
          className="absolute w-[100px] h-[100px] rounded-full border border-white/40"
          style={{
            animation: 'radioWave 3s linear infinite',
          }}
        />
        <span 
          className="absolute w-[100px] h-[100px] rounded-full border border-white/40"
          style={{
            animation: 'radioWave 3s linear infinite 1s',
          }}
        />
        <span 
          className="absolute w-[100px] h-[100px] rounded-full border border-white/40"
          style={{
            animation: 'radioWave 3s linear infinite 2s',
          }}
        />
        
        {/* White circle with icon */}
        <span className="relative flex items-center justify-center w-[100px] h-[100px] rounded-full bg-white">
          {getIcon()}
        </span>
      </a>
    </div>
  )
}

// Keep backwards compatibility
export function WhatsAppButton() {
  return <FloatingCTAButton type="whatsapp" />
}

