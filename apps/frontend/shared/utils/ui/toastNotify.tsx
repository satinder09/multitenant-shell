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
  /** Show progress bar for timed toasts */
  showProgress?: boolean
}

const variantConfig = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
    bgColor: 'bg-white dark:bg-gray-900 border-l-2 border-l-green-500',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
    bgColor: 'bg-white dark:bg-gray-900 border-l-2 border-l-red-500',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    bgColor: 'bg-white dark:bg-gray-900 border-l-2 border-l-amber-500',
  },
  info: {
    icon: <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    bgColor: 'bg-white dark:bg-gray-900 border-l-2 border-l-blue-500',
  },
  loading: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />,
    bgColor: 'bg-white dark:bg-gray-900 border-l-2 border-l-gray-400',
  },
  default: {
    icon: <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />,
    bgColor: 'bg-white dark:bg-gray-900 border-l-2 border-l-gray-400',
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
  showProgress = false,
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
    let progressTimer: NodeJS.Timeout | null = null
    
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
      if (progressTimer) {
        clearTimeout(progressTimer)
        progressTimer = null
      }
      toast.dismiss(t)
    }

    return (
      <div
        className={cn(
          // Base styles - more compact and modern
          'group relative flex items-center gap-3 w-full max-w-sm p-3 rounded-lg shadow-md transition-all duration-200',
          // Border and background - cleaner design
          'border border-transparent',
          config.bgColor,
          // Enhanced shadow
          'shadow-lg hover:shadow-xl',
          // Interactive states - subtle
          'hover:scale-[1.01] active:scale-[0.99]',
          // Dark mode support
          'dark:shadow-xl',
          // Animation entrance - quicker
          'animate-in slide-in-from-right-1 fade-in-0 duration-300',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="alert"
        aria-live="polite"
        data-testid="toast-notification"
      >
        {/* Icon - more minimal */}
        <div className="flex-shrink-0">
          {displayIcon}
        </div>

        {/* Content - more compact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {title}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>

            {/* Action button - more compact */}
            {actionLabel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleActionClick}
                className="h-7 px-2 text-xs ml-2"
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Minimal dismiss button */}
        <button
          onClick={handleDismiss}
          className={cn(
            'flex-shrink-0 flex items-center justify-center h-5 w-5 rounded',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'transition-colors duration-150',
            'focus:outline-none',
            'ml-2'
          )}
          aria-label="Dismiss notification"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Progress bar */}
        {showProgress && !sticky && duration !== Infinity && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/10 rounded-b-xl overflow-hidden">
            <div
              className={cn(
                'h-full rounded-b-xl transition-all ease-linear',
                variant === 'success' && 'bg-green-500',
                variant === 'error' && 'bg-red-500',
                variant === 'warning' && 'bg-amber-500',
                variant === 'info' && 'bg-blue-500',
                variant === 'loading' && 'bg-gray-500',
                variant === 'default' && 'bg-gray-500'
              )}
              style={{
                width: '100%',
                animation: `toast-progress ${duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
    )
  }, {
    duration: sticky ? Infinity : duration,
    position,
  })

  return toastId
}

// Add CSS animation for toast progress bar
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes toast-progress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `
  document.head.appendChild(style)
}

// Helper functions removed - use main toastNotify() function with explicit variants
// Preferred pattern: 
// toastNotify({ variant: 'success', title: 'Success!', description: 'Operation completed', showProgress: true })
// toastNotify({ variant: 'error', title: 'Error', description: 'Something went wrong', showProgress: true })
// toastNotify({ variant: 'loading', title: 'Processing...', sticky: true })

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
  const loadingToast = toastNotify({ variant: 'loading', title: loading, sticky: true })
  
  return promise
    .then((data) => {
      toast.dismiss(loadingToast)
      const successMessage = typeof success === 'function' ? success(data) : success
      toastNotify({ variant: 'success', title: successMessage, showProgress: true })
      return data
    })
    .catch((err) => {
      toast.dismiss(loadingToast)
      const errorMessage = typeof error === 'function' ? error(err) : error
      toastNotify({ variant: 'error', title: errorMessage, showProgress: true })
      throw err
    })
}

/**
 * Creates a smooth loading toast that can transition from loading to success/error
 * without flickering. Perfect for async operations that need visual feedback.
 */
export const createLoadingToast = (loadingTitle: string) => {
  const toastId = toastNotify({ 
    variant: 'loading', 
    title: loadingTitle, 
    sticky: true 
  })
  
  return {
    success: (title: string, description?: string) => {
      // Update the existing toast with success state
      toast.custom((t) => {
        const config = variantConfig['success']
        return (
          <div
            className={cn(
              'group relative flex items-center gap-3 w-full max-w-sm p-3 rounded-lg shadow-md transition-all duration-300',
              'border border-transparent',
              config.bgColor,
              'shadow-lg hover:shadow-xl',
              'hover:scale-[1.01] active:scale-[0.99]',
              'dark:shadow-xl',
              'animate-in slide-in-from-right-1 fade-in-0 duration-300',
            )}
            role="alert"
            aria-live="polite"
          >
            <div className="flex-shrink-0 transition-all duration-200">
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {title}
                  </p>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => toast.dismiss(t)}
              className={cn(
                'flex-shrink-0 flex items-center justify-center h-5 w-5 rounded',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-black/10 dark:hover:bg-white/10',
                'transition-colors duration-150',
                'focus:outline-none',
                'ml-2'
              )}
              aria-label="Dismiss notification"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/10 rounded-b-xl overflow-hidden">
              <div
                className="h-full rounded-b-xl transition-all ease-linear bg-green-500"
                style={{
                  width: '100%',
                  animation: `toast-progress 5000ms linear forwards`,
                }}
              />
            </div>
          </div>
        )
      }, {
        id: toastId,
        duration: 5000,
      })
    },
    error: (title: string, description?: string) => {
      // Update the existing toast with error state
      toast.custom((t) => {
        const config = variantConfig['error']
        return (
          <div
            className={cn(
              'group relative flex items-center gap-3 w-full max-w-sm p-3 rounded-lg shadow-md transition-all duration-300',
              'border border-transparent',
              config.bgColor,
              'shadow-lg hover:shadow-xl',
              'hover:scale-[1.01] active:scale-[0.99]',
              'dark:shadow-xl',
              'animate-in slide-in-from-right-1 fade-in-0 duration-300',
            )}
            role="alert"
            aria-live="polite"
          >
            <div className="flex-shrink-0 transition-all duration-200">
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {title}
                  </p>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => toast.dismiss(t)}
              className={cn(
                'flex-shrink-0 flex items-center justify-center h-5 w-5 rounded',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-black/10 dark:hover:bg-white/10',
                'transition-colors duration-150',
                'focus:outline-none',
                'ml-2'
              )}
              aria-label="Dismiss notification"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/10 rounded-b-xl overflow-hidden">
              <div
                className="h-full rounded-b-xl transition-all ease-linear bg-red-500"
                style={{
                  width: '100%',
                  animation: `toast-progress 5000ms linear forwards`,
                }}
              />
            </div>
          </div>
        )
      }, {
        id: toastId,
        duration: 5000,
      })
    },
    toastId
  }
}

