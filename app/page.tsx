'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MagneticButton } from '@/components/ui/magnetic-button'
import Navbar from '@/components/navbar'

const BackgroundEffect = dynamic(() => import('@/components/background-effect'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

const realEstateLinks = [
  'zillow.com/123-Main-St',
  'realtor.com/456-Oak-Avenue',
  'redfin.com/789-Park-Boulevard',
  'trulia.com/321-Elm-Street',
  'homes.com/654-Pine-Drive',
]

export default function Home() {
  const [link, setLink] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [charIndex, setCharIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const currentLink = realEstateLinks[currentLinkIndex]
    const prefix = 'eg. '
    
    if (isTyping) {
      // Typing animation
      if (charIndex < currentLink.length) {
        const timer = setTimeout(() => {
          setPlaceholder(prefix + currentLink.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        }, 50) // Typing speed
        return () => clearTimeout(timer)
      } else {
        // Finished typing, wait before deleting
        const timer = setTimeout(() => {
          setIsTyping(false)
        }, 2000) // Pause after typing
        return () => clearTimeout(timer)
      }
    } else {
      // Deleting animation
      if (charIndex > 0) {
        const timer = setTimeout(() => {
          setPlaceholder(prefix + currentLink.slice(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        }, 30) // Deleting speed
        return () => clearTimeout(timer)
      } else {
        // Finished deleting, move to next link
        const timer = setTimeout(() => {
          setCurrentLinkIndex((prev) => (prev + 1) % realEstateLinks.length)
          setIsTyping(true)
        }, 500) // Pause before next link
        return () => clearTimeout(timer)
      }
    }
  }, [charIndex, isTyping, currentLinkIndex])

  // Parallax scroll effect for screenshots
  const [showImages, setShowImages] = useState(false)
  const leftImageRef = useRef<HTMLDivElement>(null)
  const rightImageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Start fade-in animation after delay
    const showTimer = setTimeout(() => {
      setShowImages(true)
    }, 700)

    let ticking = false
    let cleanup: (() => void) | null = null

    // Wait for animation to complete before enabling parallax
    const enableParallax = setTimeout(() => {
      // Remove transition property to prevent scroll lag
      if (leftImageRef.current) leftImageRef.current.style.transition = 'none'
      if (rightImageRef.current) rightImageRef.current.style.transition = 'none'

      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollY = window.scrollY || window.pageYOffset
            const scrollFactor = 0.3 // Parallax speed

            if (leftImageRef.current) {
              // Left image moves down as you scroll
              leftImageRef.current.style.transform = `translate3d(0, calc(30% + ${scrollY * scrollFactor}px), 0)`
            }

            if (rightImageRef.current) {
              // Right image moves up as you scroll
              rightImageRef.current.style.transform = `translate3d(0, calc(30% - ${scrollY * scrollFactor}px), 0)`
            }

            ticking = false
          })
          ticking = true
        }
      }

      // Initial call to set position
      handleScroll()

      // Add scroll listeners
      window.addEventListener('scroll', handleScroll, { passive: true })

      cleanup = () => {
        window.removeEventListener('scroll', handleScroll)
      }
    }, 1500) // Wait for animation to complete (0.7s delay + 0.8s duration)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(enableParallax)
      if (cleanup) cleanup()
    }
  }, [])

  return (
    <>
      <Navbar />
      {/* Hero Section with Background Effect */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Left Screenshot - Desktop only */}
        <div
          ref={leftImageRef}
          className={`hidden lg:block absolute left-[5%] bottom-0 w-[300px] xl:w-[400px] z-10 pointer-events-none transition-all duration-1000 ease-out ${
            showImages ? 'opacity-100 translate-y-[30%]' : 'opacity-0 translate-y-[calc(30%+40px)]'
          }`}
        >
          <div className="relative w-full aspect-[9/16]">
            <Image
              src="/images/screenshot-placeholder.svg"
              alt="Generated website preview"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Right Screenshot - Desktop only, slightly higher */}
        <div
          ref={rightImageRef}
          className={`hidden lg:block absolute right-[5%] bottom-[8%] w-[300px] xl:w-[400px] z-10 pointer-events-none transition-all duration-1000 ease-out ${
            showImages ? 'opacity-100 translate-y-[30%]' : 'opacity-0 translate-y-[calc(30%+40px)]'
          }`}
        >
          <div className="relative w-full aspect-[9/16]">
            <Image
              src="/images/screenshot-placeholder.svg"
              alt="Generated website preview"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="absolute inset-0 opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
          <BackgroundEffect />
        </div>
        <div className="content relative z-20">
          <div className="quote-container flex flex-col h-full pt-[20vh]">
          {/* Eyebrow */}
          <Typography variant="small" className="mb-4 text-muted-foreground uppercase tracking-wider animate-fade-in-up">
            Ottie App
          </Typography>

          {/* Heading */}
          <Typography variant="h1" className="mb-1 font-medium max-w-3xl animate-fade-in-up-delay-1">
            Turn any listing into a premium website. Instantly. For free.
          </Typography>

          {/* Subheading */}
          <Typography variant="lead" className="mb-6 max-w-2xl leading-snug animate-fade-in-up-delay-2">
            Create a beautiful, dedicated property site in seconds - no coding, no setup, no cost.
          </Typography>

          {/* Input Section */}
          <div className="w-full max-w-md space-y-2 animate-fade-in-up-delay-3">
            <div className="relative">
              <Input
                ref={inputRef}
                id="link-input"
                type="url"
                placeholder=""
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full"
              />
              {!link && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">
                  {placeholder}
                  <span className="animate-pulse">|</span>
                </div>
              )}
            </div>
            
            <MagneticButton className="w-full" magneticDistance={120} magneticStrength={0.4}>
              Generate Free Site
            </MagneticButton>
            
            <Typography variant="small" className="text-center text-muted-foreground pt-1 text-xs">
              No registration required until you&apos;re ready to publish.
            </Typography>
            
            {/* Manual Start Link */}
            <div className="pt-1">
              <Link 
                href="#" 
                className="text-sm text-white hover:text-orange-500 underline underline-offset-4 transition-colors"
              >
                or fill in data manually
              </Link>
            </div>
          </div>

          {/* Spacer - pushes testimonial to bottom */}
          <div className="flex-grow"></div>

          {/* Bottom Section - Testimonial and Footer */}
          <div className="w-full flex flex-col items-center gap-6 pb-[15px] animate-fade-in-up-delay-4">
            {/* Testimonial Section */}
            <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Overlapping Avatars */}
              <div className="flex -space-x-2">
                {[
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
                  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=faces',
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces',
                ].map((src, i) => (
                  <div
                    key={i}
                    className="relative h-10 w-10 rounded-full border-2 border-background overflow-hidden"
                  >
                    <Image
                      src={src}
                      alt={`Realtor ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 ml-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 fill-yellow-400"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
            </div>

              {/* Testimonial Text */}
              <Typography variant="small" className="text-muted-foreground">
                Loved by 1200+ realtors
              </Typography>
            </div>

            {/* Privacy & Compliance Footer */}
            <div className="flex items-center justify-center gap-2 animate-fade-in-up-delay-5">
              <Link 
                href="/privacy" 
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">GDPR compliant</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">SOC2 ready</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Feature Points Section - Below the fold */}
      <section className="relative bg-black min-h-screen flex items-center justify-center py-20">
        {/* Mobile Screenshots - Below hero */}
        <div className="lg:hidden w-full px-4 mb-8 flex flex-col items-center gap-6">
          <div className="relative w-full max-w-[300px] aspect-[9/16] animate-fade-in-up-delay-6">
            <Image
              src="/images/screenshot-placeholder.svg"
              alt="Generated website preview"
              fill
              className="object-contain"
            />
          </div>
          <div className="relative w-full max-w-[300px] aspect-[9/16] animate-fade-in-up-delay-6">
            <Image
              src="/images/screenshot-placeholder.svg"
              alt="Generated website preview"
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="w-full max-w-4xl px-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-muted-foreground">
                No more catalog confusion — <span className="font-semibold text-foreground">each listing gets its own site</span>.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-muted-foreground">
                <span className="font-semibold text-foreground">Impress buyers instantly</span> — beautiful on every device.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-muted-foreground">
                <span className="font-semibold text-foreground">Share anywhere</span> — WhatsApp, ads, email, with a unique property link.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-muted-foreground">
                Built for <span className="font-semibold text-foreground">speed, SEO, and seamless lead capture</span>.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-muted-foreground">
                <span className="font-semibold text-foreground">Agent-first privacy</span> — your data stays yours. <span className="font-semibold text-foreground">Never sold, never shared</span>.
              </Typography>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

