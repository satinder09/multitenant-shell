// utils/ui/toastNotify.ts

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/shared/utils/utils'

type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading'

const variantStyles = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    border: 'border-green-600',
  },
  error: {
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    border: 'border-red-600',
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-600" />,
    border: 'border-blue-600',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    border: 'border-yellow-600',
  },
  loading: {
    icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
    border: 'border-border',
  },
};

interface ToastNotifyOptions {
  variant?: ToastVariant
  title: string
  description?: string
  dismissAll?: boolean
  duration?: number
  sticky?: boolean
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function toastNotify({
  variant = 'info',
  title,
  description,
  dismissAll = false,
  duration = 5000,
  sticky = false,
  actionLabel,
  onAction,
  className,
}: ToastNotifyOptions) {
  if (dismissAll) toast.dismiss()

  const { icon, border: variantBorder } = variantStyles[variant];
  let timeoutRef: NodeJS.Timeout | null = null

  const clearTimer = () => {
    if (timeoutRef) clearTimeout(timeoutRef)
  }

  const toastId = toast.custom((t) => {
    const startTimer = () => {
      if (!sticky && duration !== Infinity) {
        timeoutRef = setTimeout(() => toast.dismiss(t), duration)
      }
    }

    startTimer()

    return (
      <div
        className={cn(
          'flex items-center justify-between min-w-[340px] max-w-sm bg-card border border-border border-l-4 px-4 py-3 rounded-md shadow-lg hover:shadow-xl transition-all',
          variantBorder,
          className
        )}
        onMouseEnter={clearTimer}
        onMouseLeave={startTimer}
      >
        <div className="flex items-start gap-3">
          <div className="pt-0.5">{icon}</div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-card-foreground">{title}</p>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center ml-4 gap-1">
          {actionLabel && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onAction?.()
                toast.dismiss(t)
              }}
            >
              {actionLabel}
            </Button>
          )}
          <button
            onClick={() => toast.dismiss(t)}
            className="inline-flex items-center justify-center p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }, {
    duration: sticky ? Infinity : duration,
  })

  return toastId
}
