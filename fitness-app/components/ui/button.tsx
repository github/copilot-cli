import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-headings font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-td-blue-display text-white hover:bg-opacity-90 focus-visible:ring-td-blue-display': variant === 'default',
            'bg-td-cta-orange text-white hover:bg-opacity-90 focus-visible:ring-td-cta-orange': variant === 'primary',
            'bg-td-bg-secondary text-td-blue-text hover:bg-td-blue-display hover:text-white': variant === 'secondary',
            'border-2 border-td-blue-display text-td-blue-text hover:bg-td-blue-display hover:text-white': variant === 'outline',
            'hover:bg-td-bg-secondary text-td-text-primary': variant === 'ghost',
            'bg-td-error-red text-white hover:bg-opacity-90 focus-visible:ring-td-error-red': variant === 'danger',
          },
          {
            'h-9 px-3 text-sm': size === 'sm',
            'h-11 px-6 text-base': size === 'md',
            'h-14 px-8 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
