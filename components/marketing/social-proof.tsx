'use client'

import { useEffect, useState, useRef, memo } from 'react'
import Image from 'next/image'
import { Quote, Users, FileText, TrendingUp } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { WordReveal } from '@/components/ui/word-reveal'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'

const testimonials = [
  {
    quote: 'Sold apartment in 3 days thanks to Ottie page',
    name: 'Peter S.',
    role: 'Realtor',
    location: 'Bratislava',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
  },
  {
    quote: 'Finally something that just works. Copy link, done.',
    name: 'Maria K.',
    role: 'Century 21',
    location: 'Prague',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces',
  },
  {
    quote: 'My clients love the professional look',
    name: 'Jan N.',
    role: 'RE/MAX',
    location: 'Vienna',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces',
  },
]

const metrics = [
  { icon: Users, value: '500+', label: 'realtors' },
  { icon: FileText, value: '10K+', label: 'property pages' },
  { icon: TrendingUp, value: '+35%', label: 'more viewings' },
]

// Animated counter component - optimized with requestAnimationFrame
function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const rafRef = useRef<number | null>(null)
  
  // Extract number from target (e.g., "500+" -> 500)
  const numericValue = parseInt(target.replace(/[^0-9]/g, ''), 10)
  const hasPlus = target.includes('+')
  
  useEffect(() => {
    if (!isVisible) return
    
    const duration = 2000 // 2 seconds
    const startTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuad = (t: number) => t * (2 - t)
      const easedProgress = easeOutQuad(progress)
      
      const currentCount = Math.floor(easedProgress * numericValue)
      setCount(currentCount)
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setCount(numericValue)
      }
    }
    
    rafRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isVisible, numericValue])
  
  return (
    <span 
      className="tabular-nums"
      ref={(el) => {
        if (el && !isVisible) {
          const observer = new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) {
                setIsVisible(true)
                observer.disconnect()
              }
            },
            { threshold: 0.5 }
          )
          observer.observe(el)
        }
      }}
    >
      {count.toLocaleString()}{hasPlus ? '+' : ''}{suffix}
    </span>
  )
}

const SocialProofComponent = () => {
  return (
    <section className="relative bg-[var(--dark-bg)] py-20 md:py-28">
      <div className="w-full max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Typography variant="h2" className="text-white border-none mb-4">
            <WordReveal
              text="Trusted by realtors across Europe"
              triggerOnScroll
              delay={0}
              wordDelay={0.08}
            />
          </Typography>
        </div>

        {/* Metrics Bar */}
        <ScrollReveal delay={0.2}>
          <div className="grid grid-cols-3 gap-4 md:gap-8 mb-16">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <metric.icon className="w-5 h-5 text-white/40 mr-2" />
                  <span className="text-3xl md:text-4xl font-bold text-white">
                    <AnimatedCounter target={metric.value} />
                  </span>
                </div>
                <span className="text-sm text-white/50">{metric.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Testimonials Carousel */}
        <ScrollReveal delay={0.4}>
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <Quote className="w-8 h-8 text-white/20 mb-4" />
                    <p className="text-white/80 mb-6 text-lg leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {testimonial.name}
                        </p>
                        <p className="text-white/50 text-xs">
                          {testimonial.role}, {testimonial.location}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12 bg-white/10 border-white/20 text-white hover:bg-white/20" />
            <CarouselNext className="hidden md:flex -right-12 bg-white/10 border-white/20 text-white hover:bg-white/20" />
          </Carousel>
        </ScrollReveal>
      </div>
    </section>
  )
}

export const SocialProof = memo(SocialProofComponent)
SocialProof.displayName = 'SocialProof'

