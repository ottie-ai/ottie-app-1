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
    if (!user || typeof window === 'undefined') return

    const identifyUser = () => {
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
          console.error('Error identifying user with UserJot:', e)
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
        // Retry if SDK not loaded yet
        setTimeout(identifyUser, 100)
      }
    }

    identifyUser()
  }, [user])
}

