import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-5xl leading-[60px] font-extrabold tracking-tight",
      h2: "scroll-m-20 text-4xl leading-[50px] font-semibold tracking-tight",
      h3: "scroll-m-20 text-3xl leading-[44px] font-semibold tracking-tight",
      h4: "scroll-m-20 text-2xl leading-10 font-semibold tracking-tight",
      "heading-xl": "text-5xl leading-[60px]",
      "heading-lg": "text-4xl leading-[50px]",
      "heading-md": "text-3xl leading-[44px]",
      "heading-sm": "text-2xl leading-10",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      ul: "my-6 ml-6 list-disc [&>li]:mt-2",
      ol: "my-6 ml-6 list-decimal [&>li]:mt-2",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      pre: "my-6 overflow-x-auto rounded-lg bg-muted p-4",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
    },
  },
  defaultVariants: {
    variant: "p",
  },
})

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as, ...props }, ref) => {
    const Component = as || (variant === "h1" ? "h1" : 
                            variant === "h2" ? "h2" : 
                            variant === "h3" ? "h3" : 
                            variant === "h4" ? "h4" : 
                            variant === "heading-xl" ? "h1" :
                            variant === "heading-lg" ? "h2" :
                            variant === "heading-md" ? "h3" :
                            variant === "heading-sm" ? "h4" :
                            variant === "blockquote" ? "blockquote" : 
                            variant === "ul" ? "ul" : 
                            variant === "ol" ? "ol" : 
                            variant === "code" ? "code" : 
                            variant === "pre" ? "pre" : 
                            variant === "small" ? "small" : 
                            variant === "muted" ? "p" : 
                            variant === "lead" ? "p" : 
                            variant === "large" ? "div" : 
                            "p") as React.ElementType

    return (
      <Component
        ref={ref}
        className={cn(typographyVariants({ variant }), className)}
        {...props}
      />
    )
  }
)
Typography.displayName = "Typography"

export { Typography, typographyVariants }

