'use client'

import { usePathname } from 'next/navigation'
import { LottieSpinner } from '@/components/ui/lottie-spinner'

export default function SitesLoading() {
  const pathname = usePathname()
  const isSiteRoute = pathname?.includes('/builder') || pathname?.startsWith('/preview/')

  // For builder/preview routes, return null - let more specific loading.tsx handle it
  if (isSiteRoute) {
    return null
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <LottieSpinner size={32} />
        <p className="text-sm text-muted-foreground">Loading sites...</p>
      </div>
    </div>
  )
}
