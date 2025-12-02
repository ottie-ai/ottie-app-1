import { LottieSpinner } from '@/components/ui/lottie-spinner'

export default function LeadsLoading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <LottieSpinner size={32} />
        <p className="text-sm text-muted-foreground">Loading leads...</p>
      </div>
    </div>
  )
}

