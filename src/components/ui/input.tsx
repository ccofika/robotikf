import * as React from "react"

import { cn } from "src/lib/utils"

// Polje u izgledu Security dela (sx-input)
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input type={type} className={cn("sx-input", className)} ref={ref} {...props} />
    )
  }
)
Input.displayName = "Input"

export { Input }
