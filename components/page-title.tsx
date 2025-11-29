'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface PageTitleProps {
  title: string
  description?: string
}

/**
 * Client component to set page title dynamically
 * Used for client component pages that can't export metadata
 */
export function PageTitle({ title, description }: PageTitleProps) {
  const pathname = usePathname()

  useEffect(() => {
    document.title = `${title} | Ottie`
    
    // Update meta description if provided
    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', description)
      } else {
        const meta = document.createElement('meta')
        meta.name = 'description'
        meta.content = description
        document.head.appendChild(meta)
      }
    }
  }, [title, description, pathname])

  return null
}

