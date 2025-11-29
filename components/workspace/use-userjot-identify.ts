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
    // Don't identify if no user or invalid user data (empty ID means not authenticated)
    if (!user || typeof window === 'undefined' || !user.id || user.id === '') {
      return
    }

    const identifyUser = () => {
      // Check if SDK is initialized
      if ((window as any).uj && (window as any).uj.identify) {
        try {
          ;(window as any).uj.identify({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          })
        } catch (e) {
          // Silently fail - don't spam console with errors
          // UserJot might not be fully initialized yet
          console.debug('UserJot identify not ready yet:', e)
        }
      } else if ((window as any).$ujq) {
        // SDK is loading, queue the identify command
        ;(window as any).$ujq.push([
          'identify',
          {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
        ])
      } else {
        // Retry if SDK not loaded yet (max 10 retries = 1 second)
        let retries = 0
        const maxRetries = 10
        const retry = () => {
          if (retries < maxRetries) {
            retries++
            setTimeout(identifyUser, 100)
          }
        }
        retry()
      }
    }

    identifyUser()
  }, [user])
}

