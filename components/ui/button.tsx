'use client'

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const springTransition = {
  type: "spring" as const,
  stiffness: 250,
  damping: 10,
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  // Check if this is a navigation button or dropdown/select trigger (should not have zoom effect)
  // Check both data-slot and data-sidebar attributes
  const dataSlot = (props as any)['data-slot']
  const dataSidebar = (props as any)['data-sidebar']
  const isNavigationButton = dataSlot === 'sidebar-menu-button' || 
                             dataSlot === 'sidebar-menu-sub-button' ||
                             dataSidebar === 'menu-button' ||
                             dataSidebar === 'menu-sub-button'
  
  // Check if this is a dropdown or select trigger
  const isDropdownTrigger = dataSlot === 'select-trigger' ||
                            dataSlot === 'dropdown-menu-trigger' ||
                            dataSlot === 'dropdown-menu-sub-trigger'
  
  // For asChild, check if child element might be a dropdown/select trigger
  // When asChild is used with DropdownMenuTrigger or SelectTrigger, disable hover effect
  const shouldDisableHover = isNavigationButton || isDropdownTrigger || asChild
  
  // Motion props - apply zoom effect to all buttons except navigation, dropdown triggers, and asChild buttons
  const motionProps = shouldDisableHover ? {} : {
    whileHover: { scale: 1.03 },
    whileTap: { scale: 0.97 },
    transition: springTransition,
  }

  if (asChild) {
    // For asChild, exclude animation event handlers that conflict
    const {
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      ...restProps
    } = props
    
    // Use motion.div wrapper to apply effects while preserving Slot behavior
    return (
      <motion.div
        {...motionProps}
        style={{ display: "inline-flex" }}
        className={cn(buttonVariants({ variant, size, className }))}
      >
        <Slot
          data-slot="button"
          {...(restProps as React.ComponentProps<typeof Slot>)}
        />
      </motion.div>
    )
  }

  // Regular button with motion effects
  return (
    <motion.button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={onClick}
      {...(props as HTMLMotionProps<"button">)}
      {...motionProps}
    />
  )
}

export type ButtonProps = React.ComponentProps<typeof Button> & VariantProps<typeof buttonVariants>

export { Button, buttonVariants }
