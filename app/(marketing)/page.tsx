'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { WordReveal } from '@/components/ui/word-reveal'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { Input } from '@/components/ui/input'
import { MagneticButton } from '@/components/ui/magnetic-button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import Navbar from '@/components/marketing/navbar'
import { transformPlansToTiers } from '@/lib/pricing-data'
import { createClient } from '@/lib/supabase/client'
import type { Plan } from '@/types/database'
import { generatePreview, getPreviewStatus } from './actions'
import '../sphere.css'

const realEstateLinks = [
  'zillow.com/123-Main-St',
  'airbnb.com/rooms/456789',
  'realtor.com/456-Oak-Avenue',
  'booking.com/hotel/12345',
  'redfin.com/789-Park-Boulevard',
  'trulia.com/321-Elm-Street',
  'homes.com/654-Pine-Drive',
]

const loadingMessages = [
  'Analyzing website',
  'Processing content',
  'Generating layout',
  'Finalizing your site',
]

// Queue message shown before other messages when in queue
const queueMessage = "You're in a queue"

export default function Home() {
  const router = useRouter()
  const [link, setLink] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [charIndex, setCharIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState<'waiting' | 'entering' | 'visible' | 'exiting'>('waiting')
  const [error, setError] = useState<string | null>(null)
  const [isInQueue, setIsInQueue] = useState(false) // Track if job is in queue
  const [queuePosition, setQueuePosition] = useState<number | null>(null) // Queue position
  
  // Plans from database
  const [plans, setPlans] = useState<Plan[]>([])
  
  // Scroll-based sphere scaling
  const secondSectionRef = useRef<HTMLElement>(null)
  const thirdSectionRef = useRef<HTMLElement>(null)
  const sphereWrapperRef = useRef<HTMLDivElement>(null)

  // Load plans from database (public access)
  useEffect(() => {
    const loadPlans = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_cents', { ascending: true })
      
      if (!error && data) {
        setPlans(data)
      }
    }
    loadPlans()
  }, [])

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

  // Scroll observer for sections - directly manipulate DOM to avoid re-renders
  useEffect(() => {
    if (isLoading) return

      const handleScroll = () => {
      const secondSection = secondSectionRef.current
      const thirdSection = thirdSectionRef.current
      const sphereWrapper = sphereWrapperRef.current
      if (!secondSection || !thirdSection || !sphereWrapper) return
      
      const secondRect = secondSection.getBoundingClientRect()
      const thirdRect = thirdSection.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      
      sphereWrapper.classList.remove('sphere-scrolled', 'sphere-third')
      
      if (thirdRect.top < viewportHeight * 0.7) {
        sphereWrapper.classList.add('sphere-third')
      } else if (secondRect.top < viewportHeight * 0.7) {
        sphereWrapper.classList.add('sphere-scrolled')
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoading])

  // Loading message animation
  useEffect(() => {
    if (!isLoading) return

    // Initial delay before showing first message
    if (loadingPhase === 'waiting') {
      const timer = setTimeout(() => {
        setLoadingPhase('entering')
      }, 1000) // Wait for content to fade out and sphere to scale
      return () => clearTimeout(timer)
    }

    if (loadingPhase === 'entering') {
      const timer = setTimeout(() => {
        setLoadingPhase('visible')
      }, 1500)
      return () => clearTimeout(timer)
    }

    if (loadingPhase === 'visible') {
      const timer = setTimeout(() => {
        setLoadingPhase('exiting')
      }, 2000)
      return () => clearTimeout(timer)
            }

    if (loadingPhase === 'exiting') {
      const timer = setTimeout(() => {
        // Loop through messages
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length)
        setLoadingPhase('entering')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isLoading, loadingPhase, loadingMessageIndex])

  const sphereRef = useRef<HTMLDivElement>(null)

  // Mouse tracking for sphere rotation in idle mode (desktop only)
  const [isMobile, setIsMobile] = useState(false)
  const [hasMouseMoved, setHasMouseMoved] = useState(false)
  
  useEffect(() => {
    // Check if mobile/touch device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  useEffect(() => {
    if (isLoading || isMobile) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const sphere = sphereRef.current
      if (!sphere) return
      
      // First mouse move - disable CSS animation and switch to mouse tracking
      if (!hasMouseMoved) {
        setHasMouseMoved(true)
        sphere.style.animation = 'none'
      }

      // Calculate mouse position relative to center of screen
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      
      // Normalize to -1 to 1 range
      const x = (e.clientX - centerX) / centerX
      const y = (e.clientY - centerY) / centerY
      
      // Apply rotation based on mouse position (subtle effect)
      // Base: 126° (7 seconds into animation)
      const baseRotation = 126
      const rotateX = y * 15 // Max 15 degrees offset
      const rotateY = x * 15 // Max 15 degrees offset
      
      sphere.style.transform = `rotateZ(${baseRotation + rotateY}deg) rotateX(${-baseRotation + rotateX}deg) rotateZ(${baseRotation}deg)`
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isLoading, isMobile, hasMouseMoved])

  // Loading animation ref
  const loadingAnimationRef = useRef<number | null>(null)
  const loadingStartTimeRef = useRef<number>(0)
  const loadingStartRotationRef = useRef<number>(126)
  
  // Loading rotation animation
  useEffect(() => {
    if (!isLoading || !sphereRef.current) {
      if (loadingAnimationRef.current) {
        cancelAnimationFrame(loadingAnimationRef.current)
      }
      return
    }
    
    const animateLoading = (time: number) => {
      if (!sphereRef.current) return
      
      if (loadingStartTimeRef.current === 0) {
        loadingStartTimeRef.current = time
      }
      
      const elapsed = time - loadingStartTimeRef.current
      const rotationSpeed = 18 // degrees per second (360° / 20s)
      const rotation = loadingStartRotationRef.current + (elapsed / 1000) * rotationSpeed
      
      sphereRef.current.style.transform = `rotateZ(${rotation}deg) rotateX(${-rotation}deg) rotateZ(${rotation}deg)`
      
      loadingAnimationRef.current = requestAnimationFrame(animateLoading)
    }
    
    loadingAnimationRef.current = requestAnimationFrame(animateLoading)

    return () => {
      if (loadingAnimationRef.current) {
        cancelAnimationFrame(loadingAnimationRef.current)
      }
    }
  }, [isLoading])
  
  const handleGenerate = async () => {
    // Clear any previous error
    setError(null)
    
    // Validate URL input
    if (!link.trim()) {
      setError('Please enter a URL to scrape')
      return
    }

    if (sphereRef.current) {
      // Stop any current animation
      sphereRef.current.style.animation = 'none'
      
      // Reset loading animation timer
      loadingStartTimeRef.current = 0
      loadingStartRotationRef.current = 126
    }
    
    // Start total generation timer
    const totalStartTime = Date.now()
    
    setIsLoading(true)
    setLoadingMessageIndex(0)
    setLoadingPhase('waiting')

    try {
      // Add to queue and get preview ID
      const result = await generatePreview(link)
      
      if ('error' in result) {
        setError(result.error || 'An error occurred while generating preview')
        setIsLoading(false)
        return
      }

      const previewId = result.previewId
      const initialQueuePosition = result.queuePosition || 0

      console.log(`✅ Preview created: ${previewId}, queue position: ${initialQueuePosition}`)
      
      // Set initial queue state
      setIsInQueue(true)
      setQueuePosition(initialQueuePosition)

      // Poll status until completed or error
      let attempts = 0
      const maxAttempts = 120 // 2 minutes max (1s interval)
      
      const pollStatus = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          setError('Request timed out. Please try again.')
          setIsLoading(false)
          return
        }

        attempts++
        
        try {
          const statusResult = await getPreviewStatus(previewId)
          
          if ('error' in statusResult) {
            setError(statusResult.error || 'Failed to get status')
            setIsLoading(false)
            return
          }

          const { status, queuePosition: currentQueuePosition, processing } = statusResult

          // Update loading message based on status
          // Queue is only for scraping, so we wait for 'completed' status (includes OpenAI processing)
          if (status === 'queued') {
            // Job is in queue - show ONLY "You're in a queue" (separate step)
            setIsInQueue(true)
            setQueuePosition(currentQueuePosition)
            // Don't set loadingMessageIndex - queue message is shown separately
          } else if (status === 'scraping') {
            // Scraping in progress - show "Analyzing website" (job left queue)
            // Animation will transition smoothly - when displayMessage changes, React re-renders
            // and the existing animation cycle continues naturally (same as "Analyzing website" -> "Processing content")
            setIsInQueue(false)
            setQueuePosition(null)
            setLoadingMessageIndex(0) // "Analyzing website"
          } else if (status === 'pending') {
            // Scraping done, OpenAI processing - show processing messages
            setIsInQueue(false)
            setQueuePosition(null)
            setLoadingMessageIndex(1) // "Processing content"
          } else if (status === 'completed') {
            // Everything done (scraping + OpenAI config) - Navigate to preview
            setIsInQueue(false)
            setQueuePosition(null)
      const totalEndTime = Date.now()
      const totalDuration = totalEndTime - totalStartTime
            router.push(`/temp-preview/${previewId}?totalTime=${totalDuration}`)
            return
          } else if (status === 'error') {
            setIsInQueue(false)
            setQueuePosition(null)
            setError(statusResult.errorMessage || 'An error occurred while processing')
            setIsLoading(false)
            return
          }

          // Continue polling
          setTimeout(pollStatus, 1000) // Poll every 1 second
        } catch (err) {
          console.error('Error polling status:', err)
          // Continue polling on error (network issues)
          setTimeout(pollStatus, 2000) // Slower retry on error
        }
      }

      // Start polling
      pollStatus()
    } catch (err) {
      console.error('Error generating preview:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  // Build loading message - show queue message separately if in queue, otherwise show regular messages
  const displayMessage = isInQueue 
    ? queueMessage  // Show ONLY queue message when in queue (separate step)
    : (loadingMessages[loadingMessageIndex] || loadingMessages[0])  // Show regular messages when processing
  const loadingWords = displayMessage.split(' ')

  return (
    <div className="dark bg-[#08000d] min-h-screen overflow-hidden">
      {/* Sphere Background - animated with scale wrapper */}
        <div
        ref={sphereWrapperRef}
        className={`sphere-scale-wrapper ${isLoading ? 'sphere-expanded' : ''}`}
        >
        <div 
          ref={sphereRef}
          className={`sphere-background ${isLoading ? 'sphere-active' : ''}`}
        >
          {Array.from({ length: 36 }, (_, i) => (
            <div key={i + 1} className={`ring${i + 1}`} />
          ))}
          </div>
        </div>

      {/* Loading Text Overlay */}
      {isLoading && loadingPhase !== 'waiting' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="loading-text-home">
              {loadingWords.map((word, index) => (
                <span
                  key={`${loadingMessageIndex}-${index}`}
                  className={`loading-word-home ${loadingPhase === 'exiting' ? 'exiting' : ''}`}
                  style={{
                    animationDelay: loadingPhase === 'exiting'
                      ? `${(loadingWords.length - 1 - index) * 0.15}s`
                      : `${index * 0.18}s`,
                  }}
        >
                  {word}
                  {index < loadingWords.length - 1 && '\u00A0'}
                </span>
              ))}
            </p>
            <p className="loading-duration-home">
              <span className="shimmer-text-home">Expected duration ~30 seconds</span>
            </p>
          </div>
        </div>
      )}

      <Navbar />
      {/* Hero Section */}
      <div className={`relative min-h-screen overflow-hidden transition-all duration-1000 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="relative z-20 min-h-screen flex flex-col">
          {/* Main content - centered */}
          <div className="flex-1 flex items-center justify-center">
            <div className="quote-container flex flex-col items-center text-center">
          {/* Eyebrow */}
          <Typography variant="small" className="mb-4 text-white/60 uppercase tracking-wider animate-fade-in-up">
            Ottie App
          </Typography>

          {/* Heading */}
          <Typography variant="h1" className="mb-1 max-w-3xl text-white">
            <WordReveal 
              text="Turn any listing into a premium showcase. Instantly. For free."
              delay={0.1}
              wordDelay={0.12}
            />
          </Typography>

          {/* Subheading */}
          <Typography variant="lead" className="mb-6 max-w-xl leading-snug text-white/70">
            <WordReveal 
              text="Create a beautiful, dedicated property website in seconds - no coding, no setup, no cost."
              delay={0.8}
              wordDelay={0.08}
            />
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
                onChange={(e) => {
                  setLink(e.target.value)
                  setError(null) // Clear error when user types
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleGenerate()
                  }
                }}
                disabled={isLoading}
                className={cn(
                  "w-full bg-white/10 border-white/20 text-white placeholder:text-white/40",
                  error && "border-red-500/50"
                )}
              />
              {!link && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-sm">
                  {placeholder}
                  <span className="animate-pulse">|</span>
                </div>
              )}
            </div>
            
            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-400 animate-fade-in">
                {error}
              </p>
            )}
            
            <MagneticButton 
              className="w-full bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed" 
              magneticDistance={120} 
              magneticStrength={0.4}
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Free Site'}
            </MagneticButton>
            
            {/* Manual Start Link */}
            <div className="pt-1">
              <Link 
                href="#" 
                  className="text-sm text-white hover:text-white/80 underline underline-offset-4 transition-colors"
              >
                or fill in data manually
              </Link>
              </div>
            </div>
            </div>
          </div>

          {/* Bottom Section - Testimonial and Footer - absolute at bottom */}
          <div className="absolute bottom-0 left-0 right-0 w-full flex flex-col items-center gap-6 pb-[15px] animate-fade-in-up-delay-4">
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
                    className="relative h-10 w-10 rounded-full border-2 border-black overflow-hidden"
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
              <Typography variant="small" className="text-white/60">
                Loved by 1200+ realtors
              </Typography>
            </div>

            {/* Privacy & Compliance Footer */}
            <div className="flex items-center justify-center gap-2 animate-fade-in-up-delay-5">
              <Link 
                href="/privacy" 
                className="text-xs text-white/50 hover:text-white underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-xs text-white/50">•</span>
              <Link 
                href="/terms" 
                className="text-xs text-white/50 hover:text-white underline underline-offset-2 transition-colors"
              >
                Terms & Conditions
              </Link>
              <span className="text-xs text-white/50">•</span>
              <span className="text-xs text-white/50">GDPR compliant</span>
              <span className="text-xs text-white/50">•</span>
              <span className="text-xs text-white/50">SOC2 ready</span>
          </div>
          </div>
        </div>
      </div>

      {/* Feature Points Section - Below the fold */}
      <section 
        ref={secondSectionRef}
        className={`relative bg-[#08000d] min-h-screen flex items-center justify-center py-20 transition-all duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="w-full max-w-4xl px-4 text-center">
          <Typography variant="h2" className="mb-12 text-white border-none">
            <WordReveal 
              text="Why realtors love Ottie"
              triggerOnScroll
              delay={0}
              wordDelay={0.1}
            />
          </Typography>
          <div className="space-y-3 text-left">
            <ScrollReveal delay={0.5}>
            <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <Typography variant="small" className="text-white/60">
                  No more catalog confusion — <span className="font-semibold text-white">each listing gets its own site</span>.
              </Typography>
            </div>
            </ScrollReveal>
            <ScrollReveal delay={0.6}>
            <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <Typography variant="small" className="text-white/60">
                  <span className="font-semibold text-white">Impress buyers instantly</span> — beautiful on every device.
              </Typography>
            </div>
            </ScrollReveal>
            <ScrollReveal delay={0.7}>
            <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <Typography variant="small" className="text-white/60">
                  <span className="font-semibold text-white">Share anywhere</span> — WhatsApp, ads, email, with a unique property link.
              </Typography>
            </div>
            </ScrollReveal>
            <ScrollReveal delay={0.8}>
            <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <Typography variant="small" className="text-white/60">
                  Built for <span className="font-semibold text-white">speed, SEO, and seamless lead capture</span>.
              </Typography>
            </div>
            </ScrollReveal>
            <ScrollReveal delay={0.9}>
            <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                <Typography variant="small" className="text-white/60">
                  <span className="font-semibold text-white">Agent-first privacy</span> — your data stays yours. <span className="font-semibold text-white">Never sold, never shared</span>.
              </Typography>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection isLoading={isLoading} plans={plans} />

      {/* Third Section - CTA */}
      <section 
        ref={thirdSectionRef}
        className={`relative bg-[#08000d] min-h-screen flex items-center justify-center py-20 transition-all duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="w-full max-w-2xl px-4 text-center">
          <Typography variant="h2" className="mb-6 text-white border-none">
            <WordReveal 
              text="Ready to showcase your listings?"
              triggerOnScroll
              delay={0}
              wordDelay={0.1}
            />
          </Typography>
          <Typography variant="lead" className="mb-8 text-white/70">
            <WordReveal 
              text="Join thousands of realtors who are already using Ottie to create stunning property websites."
              triggerOnScroll
              delay={0.3}
              wordDelay={0.05}
            />
          </Typography>
          <MagneticButton 
            className="bg-white text-black hover:bg-white/90 px-8 py-3" 
            magneticDistance={100} 
            magneticStrength={0.3}
          >
            Get Started Free
          </MagneticButton>
        </div>
      </section>
    </div>
  )
}

// Pricing Section Component
function PricingSection({ isLoading, plans }: { isLoading: boolean; plans: Plan[] }) {
  const [isAnnual, setIsAnnual] = useState(true)
  
  // Transform database plans to pricing tiers (with prices from database in cents -> dollars)
  const pricingTiers = transformPlansToTiers(plans)

  const getPrice = (tier: typeof pricingTiers[0]) => {
    if (tier.monthlyPrice === 0) return '$0'
    return isAnnual ? `$${tier.annualPrice}` : `$${tier.monthlyPrice}`
  }

  const getPricePerListing = (tier: typeof pricingTiers[0]) => {
    // Use automatically calculated price per listing from database
    const pricePerListing = isAnnual ? tier.annualPricePerListing : tier.monthlyPricePerListing
    return pricePerListing !== null ? pricePerListing.toFixed(2) : null
  }

  const getAnnualSavings = (tier: typeof pricingTiers[0]) => {
    if (tier.monthlyPrice === 0) return null
    // Calculate savings per year: (monthly price - annual price) * 12 months
    // This is automatically calculated from database prices
    const savings = (tier.monthlyPrice - tier.annualPrice) * 12
    return Math.round(savings) // Round to whole dollars
  }
  
  // Helper to get feature name (handles both string and Feature object)
  const getFeatureName = (feature: string | { name: string }): string => {
    return typeof feature === 'string' ? feature : feature.name
  }

  return (
    <section 
      className={`relative bg-[#08000d] py-24 md:py-32 transition-all duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="w-full max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Typography variant="h2" className="mb-4 text-white border-none">
            <WordReveal 
              text="Simple, transparent pricing"
              triggerOnScroll
              delay={0}
              wordDelay={0.1}
            />
          </Typography>
          <Typography variant="lead" className="text-white/60 max-w-2xl mx-auto">
            <WordReveal 
              text="Start for free, upgrade as you grow. All paid plans include a 14-day free trial."
              triggerOnScroll
              delay={0.3}
              wordDelay={0.05}
            />
          </Typography>
        </div>

        {/* Billing Toggle */}
        <ScrollReveal delay={0.5}>
          <div className="flex items-center justify-center gap-3 mb-12">
            <Label className={cn("text-sm text-white/60", !isAnnual && "text-white font-medium")}>
              Monthly
            </Label>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/20"
            />
            <Label className={cn("text-sm text-white/60 flex items-center gap-2", isAnnual && "text-white font-medium")}>
              Annual
              <Badge className="bg-white/10 text-white/80 hover:bg-white/10 text-xs border-0">
                Save 15%
              </Badge>
            </Label>
          </div>
        </ScrollReveal>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {pricingTiers.map((tier, index) => {
            const savings = isAnnual ? getAnnualSavings(tier) : null
            const pricePerListing = getPricePerListing(tier)

            return (
              <ScrollReveal key={tier.id} delay={0.6 + index * 0.1}>
                <div
                  className={cn(
                    'relative flex flex-col rounded-2xl p-6 transition-all h-full',
                    tier.popular 
                      ? 'gradient-ottie-card-border bg-white/[0.03]' 
                      : 'border border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                  )}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="gradient-ottie text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  {/* Tier Header */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg text-white">{tier.name}</h3>
                    <p className="text-sm text-white/50">{tier.description}</p>
                  </div>
                  
                  {/* Price */}
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-white">{getPrice(tier)}</span>
                    {tier.monthlyPrice !== 0 && (
                      <span className="text-white/50">/month</span>
                    )}
                    {savings && (
                      <p className="text-xs text-emerald-400 mt-1">
                        Save ${savings}/year
                      </p>
                    )}
                  </div>

                  {/* Listings & Price per listing */}
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <p className="text-sm font-medium text-white/80">
                      {tier.listings} Active Listing{tier.listings > 1 ? 's' : ''}
                      {tier.extraListingPrice && (
                        <span className="text-white/40 font-normal"> + ${tier.extraListingPrice}/extra</span>
                      )}
                    </p>
                    <p className="text-sm text-white/40">{tier.teamSeats}</p>
                    {pricePerListing && (
                      <p className="text-xs text-white/30 mt-1">
                        ${pricePerListing}/listing
                      </p>
                    )}
                  </div>
                  
                  {/* Features */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {tier.includesFrom && (
                      <li className="flex items-start gap-2 text-sm font-medium text-white pb-1">
                        <Check className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                        {tier.includesFrom}
                      </li>
                    )}
                    {tier.features.slice(0, tier.includesFrom ? 4 : 6).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2 text-sm text-white/60">
                        <Check className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                        {getFeatureName(feature)}
                      </li>
                    ))}
                    {tier.features.length > (tier.includesFrom ? 4 : 6) && (
                      <li className="text-xs text-white/30 pt-1">
                        +{tier.features.length - (tier.includesFrom ? 4 : 6)} more features
                      </li>
                    )}
                  </ul>
                  
                  {/* CTA Button */}
                  <MagneticButton
                    className={cn(
                      'w-full',
                      tier.popular 
                        ? 'bg-white text-black hover:bg-white/90' 
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    )}
                    magneticDistance={60}
                    magneticStrength={0.2}
                  >
                    {tier.cta}
                  </MagneticButton>
                  {tier.trial && (
                    <p className="text-xs text-center text-white/30 mt-3">
                      14-day free trial
                    </p>
                  )}
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {/* Enterprise Section - Full Width */}
        <ScrollReveal delay={1.0}>
          <div className="mt-6 rounded-2xl border border-white/10 p-6 md:p-8 hover:border-white/20 hover:bg-white/[0.02] transition-all">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <h3 className="font-semibold text-xl text-white mb-2">Enterprise</h3>
                <p className="text-white/50 mb-4">For large brokerages and franchises with custom needs</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    Starts from 100 listings
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    Everything in Agency
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    API access
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    Dedicated account manager
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    Custom integrations
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    SLA guarantee
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <MagneticButton
                  className="bg-white/10 text-white hover:bg-white/20 border border-white/10 px-8"
                  magneticDistance={60}
                  magneticStrength={0.2}
                >
                  Contact Sales
                </MagneticButton>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
