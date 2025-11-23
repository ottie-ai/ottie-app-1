'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const BackgroundEffect = dynamic(() => import('@/components/background-effect'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

const realEstateLinks = [
  'https://www.zillow.com/homedetails/123-Main-St/12345678_zpid/',
  'https://www.realtor.com/realestateandhomes-detail/123-Main-St',
  'https://www.redfin.com/CA/Los-Angeles/123-Main-St',
  'https://www.trulia.com/p/ca/los-angeles/123-main-st',
  'https://www.homes.com/property/123-main-st',
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
    
    if (isTyping) {
      // Typing animation
      if (charIndex < currentLink.length) {
        const timer = setTimeout(() => {
          setPlaceholder(currentLink.slice(0, charIndex + 1))
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
          setPlaceholder(currentLink.slice(0, charIndex - 1))
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

  return (
    <>
      {/* Hero Section with Background Effect */}
      <div className="relative min-h-screen">
        <BackgroundEffect />
        <div className="content">
          <div className="quote-container flex flex-col h-full pt-[20vh]">
          {/* Eyebrow */}
          <Typography variant="small" className="mb-4 text-muted-foreground uppercase tracking-wider">
            Ottie App
          </Typography>

          {/* Heading */}
          <Typography variant="h1" className="mb-1 font-medium max-w-3xl">
            Turn any listing link into a luxury website. Instantly. For free.
          </Typography>

          {/* Subheading */}
          <Typography variant="lead" className="mb-6 max-w-2xl leading-snug">
            Create a premium, dedicated property site in seconds—no coding, no setup, no cost.
          </Typography>

          {/* Input Section */}
          <div className="w-full max-w-md space-y-2">
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
            
            <Button className="w-full">
              Generate Free Site
            </Button>
            
            <Typography variant="small" className="text-center text-muted-foreground pt-1">
              No registration required until you're ready to publish.
            </Typography>
            
            {/* Manual Start Link */}
            <div className="pt-1">
              <Link 
                href="#" 
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                or fill in data manually
              </Link>
            </div>
          </div>

          {/* Spacer - pushes testimonial to bottom */}
          <div className="flex-grow"></div>

          {/* Bottom Section - Testimonial and Footer */}
          <div className="w-full flex flex-col items-center gap-6 pb-[15px]">
            {/* Testimonial Section */}
            <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Overlapping Avatars */}
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="relative h-10 w-10 rounded-full border-2 border-background overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-white/30"></div>
                      </div>
                    </div>
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
            <div className="flex items-center justify-center gap-2">
              <Link 
                href="/privacy" 
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">GDPR compliant</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">SOC2 - ready</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Feature Points Section - Below the fold */}
      <section className="relative bg-black min-h-screen flex items-center justify-center py-20">
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

