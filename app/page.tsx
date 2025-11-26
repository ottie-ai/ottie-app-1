'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check } from '@phosphor-icons/react'
import { Typography } from '@/components/ui/typography'
import { WordReveal } from '@/components/ui/word-reveal'
import { Input } from '@/components/ui/input'
import { MagneticButton } from '@/components/ui/magnetic-button'
import Navbar from '@/components/navbar'
import './sphere.css'

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
  'Analysing website',
  'Processing content',
  'Generating layout',
  'Finalizing your site',
]

export default function Home() {
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

  const handleGenerate = () => {
    // Get current animation progress and set as starting point for full animation
    if (sphereRef.current) {
      const computedStyle = window.getComputedStyle(sphereRef.current)
      const transform = computedStyle.transform
      
      // Apply current transform as inline style before switching animation
      sphereRef.current.style.transform = transform
      
      // Force reflow
      void sphereRef.current.offsetHeight
      
      // Clear inline transform so CSS animation takes over
      requestAnimationFrame(() => {
        if (sphereRef.current) {
          sphereRef.current.style.transform = ''
        }
      })
    }
    
    setIsLoading(true)
    setLoadingMessageIndex(0)
    setLoadingPhase('waiting')
  }

  const currentLoadingMessage = loadingMessages[loadingMessageIndex]
  const loadingWords = currentLoadingMessage.split(' ')

  return (
    <div className="dark bg-black min-h-screen overflow-hidden">
      {/* Sphere Background - animated with scale wrapper */}
      <div className={`sphere-scale-wrapper ${isLoading ? 'sphere-expanded' : ''}`}>
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
        <div className="content relative z-20">
          <div className="quote-container flex flex-col h-full pt-[20vh]">
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
                onChange={(e) => setLink(e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
              {!link && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-sm">
                  {placeholder}
                  <span className="animate-pulse">|</span>
                </div>
              )}
            </div>
            
            <MagneticButton 
              className="w-full bg-white text-black hover:bg-white/90" 
              magneticDistance={120} 
              magneticStrength={0.4}
              onClick={handleGenerate}
            >
              Generate Free Site
            </MagneticButton>
            
            <Typography variant="small" className="text-center text-white/50 pt-1 text-xs">
              No registration required until you&apos;re ready to publish.
            </Typography>
            
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
              <span className="text-xs text-white/50">GDPR compliant</span>
              <span className="text-xs text-white/50">•</span>
              <span className="text-xs text-white/50">SOC2 ready</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Feature Points Section - Below the fold */}
      <section className={`relative bg-black min-h-screen flex items-center justify-center py-20 transition-all duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-full max-w-4xl px-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-white/60">
                No more catalog confusion — <span className="font-semibold text-white">each listing gets its own site</span>.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-white/60">
                <span className="font-semibold text-white">Impress buyers instantly</span> — beautiful on every device.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-white/60">
                <span className="font-semibold text-white">Share anywhere</span> — WhatsApp, ads, email, with a unique property link.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-white/60">
                Built for <span className="font-semibold text-white">speed, SEO, and seamless lead capture</span>.
              </Typography>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
              <Typography variant="small" className="text-white/60">
                <span className="font-semibold text-white">Agent-first privacy</span> — your data stays yours. <span className="font-semibold text-white">Never sold, never shared</span>.
              </Typography>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
