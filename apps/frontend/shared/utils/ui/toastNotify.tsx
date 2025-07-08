/**
 * @fileoverview Enhanced Toast Notification Utility
 * 
 * A comprehensive toast notification system built on top of Sonner
 * with ShadCN UI components and design tokens.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * toastNotify({ variant: 'success', title: 'Success!' })
 * 
 * // With description and action
 * toastNotify({
 *   variant: 'error',
 *   title: 'Something went wrong',
 *   description: 'Please try again later',
 *   actionLabel: 'Retry',
 *   onAction: () => retryOperation()
 * })
 * 
 * // Loading state
 * const toastId = toastNotify({ variant: 'loading', title: 'Processing...' })
 * // Later update or dismiss
 * toast.dismiss(toastId)
 * ```
 */

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/shared/utils/utils'
import { ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading' | 'default'

export interface ToastNotifyOptions {
  /** The type of toast notification */
  variant?: ToastVariant
  /** The main title of the toast */
  title: string
  /** Optional description text */
  description?: string
  /** Dismiss all existing toasts before showing this one */
  dismissAll?: boolean
  /** Duration in milliseconds (default: 5000) */
  duration?: number
  /** Keep toast visible until manually dismissed */
  sticky?: boolean
  /** Action button label */
  actionLabel?: string
  /** Action button click handler */
  onAction?: () => void
  /** Additional CSS classes */
  className?: string
  /** Custom icon override */
  icon?: ReactNode
  /** Position of the toast */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

const variantConfig = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/50',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
  },
  loading: {
    icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
    borderColor: 'border-l-border',
    bgColor: 'bg-muted/50',
  },
  default: {
    icon: <Clock className="h-5 w-5 text-muted-foreground" />,
    borderColor: 'border-l-border',
    bgColor: 'bg-card',
  },
} as const

/**
 * Display a toast notification with ShadCN UI styling
 * 
 * @param options - Configuration options for the toast
 * @returns Toast ID for manual dismissal
 */
export function toastNotify({
  variant = 'default',
  title,
  description,
  dismissAll = false,
  duration = 5000,
  sticky = false,
  actionLabel,
  onAction,
  className,
  icon: customIcon,
  position = 'top-right',
}: ToastNotifyOptions): string | number {
  if (dismissAll) {
    toast.dismiss()
  }

  const config = variantConfig[variant]
  const displayIcon = customIcon || config.icon
  let timeoutRef: NodeJS.Timeout | null = null

  const clearTimer = () => {
    if (timeoutRef) {
      clearTimeout(timeoutRef)
      timeoutRef = null
    }
  }

  const toastId = toast.custom((t) => {
    const startTimer = () => {
      clearTimer()
      if (!sticky && duration !== Infinity) {
        timeoutRef = setTimeout(() => {
          toast.dismiss(t)
        }, duration)
      }
    }

    // Start timer initially
    startTimer()

    const handleMouseEnter = () => {
      clearTimer()
    }

    const handleMouseLeave = () => {
      startTimer()
    }

    const handleActionClick = () => {
      try {
        onAction?.()
      } catch (error) {
        console.error('Toast action error:', error)
      } finally {
        toast.dismiss(t)
      }
    }

    const handleDismiss = () => {
      clearTimer()
      toast.dismiss(t)
    }

    return (
      <div
        className={cn(
          // Base styles
          'group relative flex items-start gap-3 w-full max-w-md p-4 rounded-lg shadow-lg transition-all duration-200',
          // Border and background
          'border border-l-4 border-border',
          config.borderColor,
          config.bgColor,
          // Interactive states
          'hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]',
          // Dark mode support
          'dark:border-border dark:shadow-2xl',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="alert"
        aria-live="polite"
        data-testid="toast-notification"
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {displayIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground leading-5">
                {title}
              </h4>
            {description && (
                <p className="mt-1 text-sm text-muted-foreground leading-5">
                  {description}
                </p>
            )}
          </div>

            {/* Action button */}
          {actionLabel && (
            <Button
              variant="secondary"
              size="sm"
                onClick={handleActionClick}
                className="ml-2 h-8 px-3 text-xs"
            >
              {actionLabel}
            </Button>
          )}
          </div>
        </div>

        {/* Dismiss button */}
          <button
          onClick={handleDismiss}
          className={cn(
            'absolute top-2 right-2 flex items-center justify-center h-6 w-6 rounded-full',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted active:bg-muted/80',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'opacity-0 group-hover:opacity-100'
          )}
          aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
      </div>
    )
  }, {
    duration: sticky ? Infinity : duration,
    position,
  })

  return toastId
}

/**
 * Quick success toast
 */
export const toastSuccess = (title: string, description?: string) =>
  toastNotify({ variant: 'success', title, description })

/**
 * Quick error toast
 */
export const toastError = (title: string, description?: string) =>
  toastNotify({ variant: 'error', title, description })

/**
 * Quick info toast
 */
export const toastInfo = (title: string, description?: string) =>
  toastNotify({ variant: 'info', title, description })

/**
 * Quick warning toast
 */
export const toastWarning = (title: string, description?: string) =>
  toastNotify({ variant: 'warning', title, description })

/**
 * Loading toast that can be updated
 */
export const toastLoading = (title: string) =>
  toastNotify({ variant: 'loading', title, sticky: true })

/**
 * Promise-based toast for async operations
 */
export const toastPromise = <T,>(
  promise: Promise<T>,
  {
    loading = 'Loading...',
    success = 'Success!',
    error = 'Something went wrong',
  }: {
    loading?: string
    success?: string | ((data: T) => string)
    error?: string | ((error: any) => string)
  } = {}
): Promise<T> => {
  const loadingToast = toastLoading(loading)
  
  return promise
    .then((data) => {
      toast.dismiss(loadingToast)
      const successMessage = typeof success === 'function' ? success(data) : success
      toastSuccess(successMessage)
      return data
    })
    .catch((err) => {
      toast.dismiss(loadingToast)
      const errorMessage = typeof error === 'function' ? error(err) : error
      toastError(errorMessage)
      throw err
    })
}

