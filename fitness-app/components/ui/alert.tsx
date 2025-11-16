import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const icons = {
      default: <Info className="h-5 w-5" />,
      success: <CheckCircle2 className="h-5 w-5" />,
      warning: <AlertCircle className="h-5 w-5" />,
      error: <XCircle className="h-5 w-5" />,
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4 flex items-start gap-3",
          {
            'bg-blue-50 border-blue-200 text-blue-900': variant === 'default',
            'bg-green-50 border-green-200 text-green-900': variant === 'success',
            'bg-yellow-50 border-yellow-200 text-yellow-900': variant === 'warning',
            'bg-red-50 border-red-200 text-red-900': variant === 'error',
          },
          className
        )}
        {...props}
      >
        <div className="flex-shrink-0">
          {icons[variant]}
        </div>
        <div className="flex-1 text-sm font-medium">
          {children}
        </div>
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-bold leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
