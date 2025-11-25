'use client'

import * as React from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useMagnetic } from '@/hooks/useMagnetic'
import { type VariantProps } from 'class-variance-authority'

interface MagneticButtonProps 
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  magneticDistance?: number
  magneticStrength?: number
  asChild?: boolean
}

export const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ magneticDistance = 100, magneticStrength = 0.3, className, children, ...props }, ref) => {
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
      >
        {children}
      </Button>
    )
  }
)

MagneticButton.displayName = 'MagneticButton'
