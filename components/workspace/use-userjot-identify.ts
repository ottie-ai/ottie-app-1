'use client'

import { useEffect } from 'react'

interface UserJotUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatar?: string
}

/**
 * Hook to identify user with UserJot
 * Call this after user authentication/login
 */
export function useUserJotIdentify(user: UserJotUser | null) {
  useEffect(() => {
    // Don't identify if no user or invalid user data
    // UserJot requires at least a valid ID and email
    if (!user || typeof window === 'undefined' || !user.id || user.id === '' || !user.email || user.email === '') {
      return
    }

    const identifyUser = () => {
      const win = window as any
      
      // Prepare identify data
      const identifyData: any = {
            id: user.id,
            email: user.email,
      }
      
      // Add optional fields only if they exist
      if (user.firstName) identifyData.firstName = user.firstName
      if (user.lastName) identifyData.lastName = user.lastName
      if (user.avatar) identifyData.avatar = user.avatar
      
      // Always use queue system to ensure SDK is ready
      // This prevents "No valid identification token" errors
      if (win.$ujq) {
        // Queue exists - SDK is loading or loaded, queue the identify command
        // This will be executed after SDK loads and init is called
        win.$ujq.push(['identify', identifyData])
      } else {
        // Initialize queue if it doesn't exist
        win.$ujq = []
        win.$ujq.push(['identify', identifyData])
        
        // Also initialize proxy if needed
        if (!win.uj) {
          win.uj = new Proxy(
            {},
            {
              get: (_: any, p: string) => (...a: any[]) => win.$ujq.push([p, ...a]),
            }
          )
        }
      }
    }

    // Wait a bit for SDK to load before trying to identify
    // This ensures UserJotLoader has time to initialize
    const timeoutId = setTimeout(identifyUser, 500)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [user])
}

