'use client'

import { useEffect, useRef } from 'react'
import './ScrollStack.css'

export const ScrollStackItem = ({ 
  children, 
  itemClassName = '' 
}: { 
  children: React.ReactNode
  itemClassName?: string 
}) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>
    {children}
  </div>
)

interface ScrollStackProps {
  children: React.ReactNode
  className?: string
  itemDistance?: number
  itemScale?: number
  itemStackDistance?: number
  stackPosition?: string
  scaleEndPosition?: string
  baseScale?: number
  rotationAmount?: number
  blurAmount?: number
  useWindowScroll?: boolean
  onStackComplete?: () => void
}

const ScrollStack = ({
  children,
  className = '',
  itemStackDistance = 30,
  stackPosition = '20%',
  onStackComplete
}: ScrollStackProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLElement[]>([])
  const cardsInitialTopRef = useRef<number[]>([])
  const stackCompletedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Get all cards
    const cards = Array.from(container.querySelectorAll<HTMLElement>('.scroll-stack-card'))
    cardsRef.current = cards

    if (cards.length === 0) return

    // Find scroll container (parent with overflow or window)
    const findScrollContainer = (): HTMLElement | Window => {
      let parent: HTMLElement | null = container.parentElement
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return parent
        }
        parent = parent.parentElement
      }
      return window
    }

    const scrollContainer = findScrollContainer()
    const isWindow = scrollContainer === window

    // Parse stack position percentage
    const parseStackPosition = (): number => {
      if (typeof stackPosition === 'string' && stackPosition.includes('%')) {
        return parseFloat(stackPosition) / 100
      }
      return 0.2
    }

    const stackPosRatio = parseStackPosition()

    // Store initial positions of cards relative to their offset parent
    const getCardTop = (card: HTMLElement): number => {
      if (isWindow) {
        // For window scroll, use offsetTop relative to document
        let offsetTop = 0
        let element: HTMLElement | null = card
        while (element) {
          offsetTop += element.offsetTop
          element = element.offsetParent as HTMLElement | null
        }
        return offsetTop
      } else {
        // For container scroll, use offsetTop relative to container
        const containerEl = scrollContainer as HTMLElement
        return card.offsetTop
      }
    }

    const handleScroll = () => {
      const viewportHeight = isWindow 
        ? window.innerHeight 
        : (scrollContainer as HTMLElement).clientHeight
      
      const stackPosY = viewportHeight * stackPosRatio

      // Get scroll position
      const scrollTop = isWindow 
        ? window.scrollY 
        : (scrollContainer as HTMLElement).scrollTop

      // Calculate when stickyness should end
      // This happens when the section ends (based on container bottom)
      const lastCardIndex = cards.length - 1
      const lastCardInitialTop = cardsInitialTopRef.current[lastCardIndex]
      
      let stickyEndPoint: number | null = null
      if (lastCardInitialTop !== undefined) {
        if (cards.length > 1) {
          // For multiple cards (like the highlights cards)
          const equalGap = 150 // Same as used for stackOffset
          const lastCardStackOffset = equalGap * lastCardIndex
          // Last card's trigger point (when it starts pinning)
          const lastCardTriggerStart = lastCardInitialTop - stackPosY - lastCardStackOffset
          // Stickyness ends when the last card has reached its final position
          // and we've scrolled enough to let it continue normally
          // The end point is when the last card's final position is at the bottom of viewport
          stickyEndPoint = lastCardTriggerStart + stackPosY + lastCardStackOffset
        } else {
          // For single cards (like the title), find the parent section container
          // and use its bottom to determine when to stop being sticky
          // Also check for other ScrollStack containers in the same section (cards)
          let sectionContainer: HTMLElement | null = container.parentElement
          while (sectionContainer && sectionContainer !== document.body) {
            // Look for a section element
            if (sectionContainer.tagName === 'SECTION') {
              break
            }
            sectionContainer = sectionContainer.parentElement
          }
          
          if (sectionContainer) {
            // Find the last ScrollStack container in the section (cards section)
            const allScrollStacks = sectionContainer.querySelectorAll<HTMLElement>('.scroll-stack-container')
            let lastCardsStack: HTMLElement | null = null
            
            // Find the last ScrollStack that has multiple cards (not the title)
            for (let i = 0; i < allScrollStacks.length; i++) {
              const stack = allScrollStacks[i]
              const stackCards = stack.querySelectorAll('.scroll-stack-card')
              if (stackCards.length > 1) {
                lastCardsStack = stack
              }
            }
            
            if (lastCardsStack) {
              // Use the last card's position to determine when title should stop being sticky
              const lastCard: HTMLElement | null = lastCardsStack.querySelector('.scroll-stack-card:last-child')
              if (lastCard) {
                const lastCardRect = lastCard.getBoundingClientRect()
                const lastCardBottom = isWindow
                  ? lastCardRect.bottom + window.scrollY
                  : lastCardRect.bottom + (scrollContainer as HTMLElement).scrollTop
                // End sticky when last card's bottom reaches viewport bottom
                stickyEndPoint = lastCardBottom - viewportHeight
              } else {
                // Fallback to section bottom
                const sectionRect = sectionContainer.getBoundingClientRect()
                const sectionBottom = isWindow
                  ? sectionRect.bottom + window.scrollY
                  : sectionRect.bottom + (scrollContainer as HTMLElement).scrollTop
                stickyEndPoint = sectionBottom - viewportHeight + stackPosY
              }
            } else {
              // No cards section found, use section bottom
              const sectionRect = sectionContainer.getBoundingClientRect()
              const sectionBottom = isWindow
                ? sectionRect.bottom + window.scrollY
                : sectionRect.bottom + (scrollContainer as HTMLElement).scrollTop
              stickyEndPoint = sectionBottom - viewportHeight + stackPosY
            }
          } else {
            // Fallback: don't set stickyEndPoint for single cards if no section found
            // This allows them to remain sticky
            stickyEndPoint = null
          }
        }
      }

      cards.forEach((card, index) => {
        const cardInitialTop = cardsInitialTopRef.current[index]
        if (cardInitialTop === undefined) return
        
        // Calculate final stack offset for this card
        // First card stays at stackPosY, other cards stop lower with equal spacing
        let stackOffset = 0
        
        if (index === 0) {
          // First card stays at stackPosY
          stackOffset = 0
        } else {
          // For subsequent cards, use equal spacing between all cards
          // Each card after the first has the same gap (e.g., 150px)
          const equalGap = 150 // Adjust this value to control spacing between cards
          stackOffset = equalGap * index
        }
        
        // Trigger point must match the final position to avoid jumping
        // When card reaches triggerStart, it should be at stackPosY + stackOffset
        const triggerStart = cardInitialTop - stackPosY - stackOffset
        
        // Check if stickyness should end (we've scrolled past the end point)
        const shouldEndSticky = stickyEndPoint !== null && scrollTop >= stickyEndPoint
        
        if (shouldEndSticky) {
          // Stickyness has ended - cards stay at their final stacked position
          // They no longer follow the scroll, so they remain in the section
          if (cards.length > 1) {
            // For multiple cards, lock at final stacked position
            const equalGap = 150
            const finalStackedOffset = index === 0 ? 0 : equalGap * index
            // Lock cards at their final stacked position (relative to their initial position)
            // This is the position they were at when stickyEndPoint was reached
            const finalTranslateY = stickyEndPoint !== null ? stickyEndPoint - cardInitialTop + stackPosY + finalStackedOffset : 0
            card.style.transform = `translate3d(0, ${finalTranslateY}px, 0)`
          } else {
            // For single cards (like title), just reset transform to let it scroll normally
            // but keep it at the position where sticky ended
            const finalTranslateY = stickyEndPoint !== null ? stickyEndPoint - cardInitialTop + stackPosY : 0
            card.style.transform = `translate3d(0, ${finalTranslateY}px, 0)`
          }
        } else {
          const isPinned = scrollTop >= triggerStart

          if (isPinned) {
            // Card is pinned - use original formula: scrollTop - cardTop + stackPositionPx + offset
            // This ensures smooth transition without jumping
            const translateY = scrollTop - cardInitialTop + stackPosY + stackOffset
            card.style.transform = `translate3d(0, ${translateY}px, 0)`
          } else {
            // Card hasn't reached trigger point yet, scroll normally
            card.style.transform = 'translate3d(0, 0, 0)'
          }
        }
        
        // Update z-index during scroll
        // Single cards (like title) get z-index 0 to stay behind stacked cards
        // Multiple cards get z-index based on their index
        if (cards.length === 1) {
          card.style.zIndex = '0'
        } else {
          card.style.zIndex = String(index + 10)
        }
      })

      // Check if stack is complete (last card is pinned)
      if (lastCardInitialTop !== undefined) {
        const equalGap = 150
        const lastCardStackOffset = equalGap * lastCardIndex
        const lastTriggerStart = lastCardInitialTop - stackPosY - lastCardStackOffset
        const isComplete = scrollTop >= lastTriggerStart && (stickyEndPoint === null || scrollTop < stickyEndPoint)
        
        if (isComplete && !stackCompletedRef.current) {
          stackCompletedRef.current = true
          onStackComplete?.()
        } else if (!isComplete && stackCompletedRef.current) {
          stackCompletedRef.current = false
        }
      }
    }

    // Setup styles
    cards.forEach((card, i) => {
      card.style.willChange = 'transform'
      card.style.transformOrigin = 'top center'
      card.style.backfaceVisibility = 'hidden'
      card.style.position = 'relative'
      // Single cards (like title) get z-index 0 to stay behind stacked cards
      // Multiple cards get z-index based on their index + 10
      if (cards.length === 1) {
        card.style.zIndex = '0'
      } else {
        card.style.zIndex = String(i + 10)
      }
    })

    // Store initial positions - wait for layout to settle
    requestAnimationFrame(() => {
      cardsInitialTopRef.current = cards.map(card => getCardTop(card))
      
      // Add scroll listener
      if (isWindow) {
        window.addEventListener('scroll', handleScroll, { passive: true })
      } else {
        (scrollContainer as HTMLElement).addEventListener('scroll', handleScroll, { passive: true })
      }

      // Initial update
      handleScroll()
    })

    return () => {
      if (isWindow) {
        window.removeEventListener('scroll', handleScroll)
      } else {
        (scrollContainer as HTMLElement).removeEventListener('scroll', handleScroll)
      }
      stackCompletedRef.current = false
    }
  }, [itemStackDistance, stackPosition, onStackComplete])

  return (
    <div className={`scroll-stack-container ${className}`.trim()} ref={containerRef}>
      {children}
    </div>
  )
}

export default ScrollStack

