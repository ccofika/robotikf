import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "src/lib/utils"

// shadcn dugme u izgledu Security dela (sx-btn); varijante i veličine kao ranije
const buttonVariants = cva(
  "sx-btn sx-fill",
  {
    variants: {
      variant: {
        default: "sx-btn--primary",
        destructive: "sx-btn--danger",
        outline: "",
        secondary: "",
        ghost: "sx-btn--ghost",
        link: "mx-btn--link",
      },
      size: {
        default: "",
        sm: "sx-btn--sm",
        lg: "sx-btn--lg",
        icon: "sx-btn--icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
