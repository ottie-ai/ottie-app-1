import { useEffect, RefObject } from 'react'

/**
 * Hook to detect clicks outside of an element
 * Ignores clicks inside popover, dialog, and other portal-based components
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current
      if (!el || el.contains((event?.target as Node) || null)) {
        return
      }

      // Ignore clicks inside popover/dialog/select portals
      const target = event.target as HTMLElement
      if (target) {
        // Check if click is inside a popover
        const popoverContent = target.closest('[data-slot="popover-content"]')
        if (popoverContent) {
          return
        }
        
        // Check if click is inside a dialog
        const dialogContent = target.closest('[role="dialog"]')
        if (dialogContent) {
          return
        }
        
        // Check if click is inside a select portal
        const selectContent = target.closest('[role="listbox"]')
        if (selectContent) {
          return
        }
      }

      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

