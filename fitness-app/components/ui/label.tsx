import * as React from "react"
import { cn } from "@/lib/utils"

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-semibold text-td-text-primary mb-2",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-td-error-red ml-1">*</span>}
      </label>
    )
  }
)
Label.displayName = "Label"

export { Label }
