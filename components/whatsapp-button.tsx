'use client'

import { WhatsappLogo, Phone, Envelope } from '@phosphor-icons/react'
import { CTAType, ColorScheme } from '@/types/builder'
import { useMagnetic } from '@/hooks/useMagnetic'
import { cn } from '@/lib/utils'

interface FloatingCTAButtonProps {
  type?: CTAType
  value?: string
  /** Current color scheme - button inverts colors based on this */
  colorScheme?: ColorScheme
}

export function FloatingCTAButton({ type = 'whatsapp', value = '', colorScheme = 'dark' }: FloatingCTAButtonProps) {
  const magneticRef = useMagnetic<HTMLAnchorElement>({
    distance: 150,
    strength: 0.4,
  })

  if (type === 'none') return null

  // Invert colors based on section color scheme
  // On dark sections: white button with black icon
  // On light sections: black button with white icon
  const isDark = colorScheme === 'dark'
  const buttonBg = isDark ? 'bg-white' : 'bg-black'
  const iconColor = isDark ? 'text-black' : 'text-white'
  const ringColor = isDark ? 'border-white/40' : 'border-black/30'

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
        return <WhatsappLogo className={cn('size-10', iconColor)} weight="fill" />
      case 'phone':
        return <Phone className={cn('size-10', iconColor)} weight="fill" />
      case 'email':
        return <Envelope className={cn('size-10', iconColor)} weight="fill" />
      default:
        return null
    }
  }

  return (
    <div className="fixed right-6 md:right-10 bottom-10 md:bottom-12 z-50">
      <a
        ref={magneticRef}
        href={getHref()}
        target={type === 'email' ? undefined : '_blank'}
        rel={type === 'email' ? undefined : 'noopener noreferrer'}
        className="group relative flex items-center justify-center"
      >
        {/* Radio wave rings - emanating outward with equal spacing */}
        <span 
          className={cn('absolute w-[100px] h-[100px] rounded-full border transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]', ringColor)}
          style={{
            animation: 'radioWave 3s linear infinite',
          }}
        />
        <span 
          className={cn('absolute w-[100px] h-[100px] rounded-full border transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]', ringColor)}
          style={{
            animation: 'radioWave 3s linear infinite 1s',
          }}
        />
        <span 
          className={cn('absolute w-[100px] h-[100px] rounded-full border transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]', ringColor)}
          style={{
            animation: 'radioWave 3s linear infinite 2s',
          }}
        />
        
        {/* Circle with icon - inverts based on color scheme */}
        <span className={cn(
          'relative flex items-center justify-center w-[100px] h-[100px] rounded-full transition-colors duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]',
          buttonBg
        )}>
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

