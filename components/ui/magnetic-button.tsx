'use client'

import * as React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { useMagnetic } from '@/hooks/useMagnetic'

interface MagneticButtonProps extends ButtonProps {
  magneticDistance?: number
  magneticStrength?: number
}

export const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ magneticDistance = 100, magneticStrength = 0.3, className, ...props }, ref) => {
    const magneticRef = useMagnetic<HTMLButtonElement>({
      distance: magneticDistance,
      strength: magneticStrength,
    })

    // Merge refs
    const setRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        magneticRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref, magneticRef]
    )

    return (
      <Button
        ref={setRefs}
        className={className}
        {...props}
      />
    )
  }
)

MagneticButton.displayName = 'MagneticButton'

