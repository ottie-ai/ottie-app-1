'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface FeedbackContextType {
  feedbackOpen: boolean
  setFeedbackOpen: (open: boolean) => void
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <FeedbackContext.Provider value={{ feedbackOpen, setFeedbackOpen }}>
      {children}
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (context === undefined) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return context
}

