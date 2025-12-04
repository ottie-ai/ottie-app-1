'use client'

import { toast as sonnerToast } from 'sonner'
import { LottieCheckIcon } from '@/components/ui/lottie-check-icon'

/**
 * Toast helper with Lottie check icon for success messages
 */
export function toastSuccess(message: string, options?: Parameters<typeof sonnerToast>[1]) {
  return sonnerToast(message, {
    ...options,
    icon: (
      <div className="flex items-center justify-center flex-shrink-0 self-center" style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LottieCheckIcon size={20} autoPlay={true} />
      </div>
    ),
    className: 'items-center',
  })
}

/**
 * Re-export other toast functions for convenience
 */
export { toast as toastError, toast as toastInfo, toast as toastWarning } from 'sonner'
export { toast } from 'sonner'

