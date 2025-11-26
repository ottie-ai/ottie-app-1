'use client'

import { useState, useEffect, useRef } from 'react'
import './loading.css'

const loadingMessages = [
  'Analysing website',
  'Processing content',
  'Generating layout',
  'Finalizing your site',
]

// Find the longest message for sizing
const longestMessage = loadingMessages.reduce((a, b) => a.length > b.length ? a : b)

export default function LoadingPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering')
  const [isComplete, setIsComplete] = useState(false)
  const [fontSize, setFontSize] = useState('8vw')
  const textRef = useRef<HTMLParagraphElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)

  // Calculate font size based on longest message
  useEffect(() => {
    const calculateFontSize = () => {
      if (!measureRef.current) return
      
      const targetWidth = window.innerWidth * 0.6
      let size = 8 // Start with 8vw equivalent
      
      // Binary search for the right size
      let low = 1
      let high = 15
      
      while (high - low > 0.1) {
        const mid = (low + high) / 2
        measureRef.current.style.fontSize = `${mid}vw`
        
        if (measureRef.current.offsetWidth > targetWidth) {
          high = mid
        } else {
          low = mid
        }
      }
      
      setFontSize(`${low}vw`)
    }

    calculateFontSize()
    window.addEventListener('resize', calculateFontSize)
    return () => window.removeEventListener('resize', calculateFontSize)
  }, [])

  useEffect(() => {
    if (isComplete) return

    if (phase === 'entering') {
      // After words animate in, switch to visible
      const timer = setTimeout(() => {
        setPhase('visible')
      }, 1500) // Time for all words to animate in
      return () => clearTimeout(timer)
    }

    if (phase === 'visible') {
      // Stay visible for a moment, then start exiting
      const timer = setTimeout(() => {
        setPhase('exiting')
      }, 2000) // Time to stay visible
      return () => clearTimeout(timer)
    }

    if (phase === 'exiting') {
      // After exit animation, move to next message (loop back to start)
      const timer = setTimeout(() => {
        setCurrentIndex((currentIndex + 1) % loadingMessages.length)
        setPhase('entering')
      }, 1500) // Time for all words to animate out
      return () => clearTimeout(timer)
    }
  }, [currentIndex, phase, isComplete])

  const currentMessage = loadingMessages[currentIndex]
  const words = currentMessage.split(' ')

  return (
    <div className="loading-container">
      <div className="sphere">
        {Array.from({ length: 36 }, (_, i) => (
          <div key={i + 1} className={`ring${i + 1}`} />
        ))}
      </div>
      
      {/* Hidden element to measure longest text */}
      <span 
        ref={measureRef} 
        className="loading-text-measure"
        aria-hidden="true"
      >
        {longestMessage}
      </span>

      {/* Loading text */}
      <div className="loading-text-container">
        <p className="loading-text" ref={textRef} style={{ fontSize }}>
          {words.map((word, index) => (
            <span
              key={`${currentIndex}-${index}`}
              className={`loading-word ${phase === 'exiting' ? 'exiting' : ''}`}
              style={{
                animationDelay: phase === 'exiting' 
                  ? `${(words.length - 1 - index) * 0.15}s` // Reverse order for exit
                  : `${index * 0.18}s`,
              }}
            >
              {word}
              {index < words.length - 1 && '\u00A0'}
            </span>
          ))}
        </p>
        <p className="loading-duration">
          <span className="shimmer-text">Expected duration ~30 seconds</span>
        </p>
      </div>
    </div>
  )
}

