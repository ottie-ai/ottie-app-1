'use client'

import { useState, useEffect } from 'react'
import './loading.css'

const loadingMessages = [
  'Analysing website...',
  'Processing content...',
  'Generating layout...',
  'Finalizing your site...',
]

export default function LoadingPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering')
  const [isComplete, setIsComplete] = useState(false)

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
      
      {/* Loading text */}
      <div className="loading-text-container">
        <p className="loading-text">
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
          <span className="shimmer-text">Expected duration ~1 min</span>
        </p>
      </div>
    </div>
  )
}

