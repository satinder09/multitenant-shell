/**
 * @fileoverview Enhanced Dialog Utilities - Flexible Button & Content System
 * 
 * A comprehensive dialog system with full control over buttons, content, and behavior.
 * Supports simple alerts, confirmations, and complex modal dialogs.
 * 
 * @example
 * ```tsx
 * // Simple alert (no buttons by default)
 * alert('Hello world!')
 * 
 * // Alert with custom close button
 * alert({
 *   title: 'Success',
 *   description: 'Operation completed',
 *   buttons: [{ label: 'Got it!', variant: 'default' }]
 * })
 * 
 * // Confirm with default buttons
 * confirm({
 *   title: 'Delete item',
 *   description: 'Are you sure?',
 *   onConfirm: () => deleteItem()
 * })
 * 
 * // Confirm with custom buttons
 * confirm({
 *   title: 'Save changes',
 *   buttons: [
 *     { label: 'Save', variant: 'default', onClick: save },
 *     { label: 'Don\'t Save', variant: 'destructive', onClick: discard },
 *     { label: 'Cancel', variant: 'outline', onClick: cancel }
 *   ]
 * })
 * 
 * // Complex dialog with custom content
 * dialog({
 *   title: 'User Profile',
 *   content: <UserProfileForm />,
 *   size: 'lg',
 *   buttons: [
 *     { label: 'Save', variant: 'default', onClick: handleSave },
 *     { label: 'Cancel', variant: 'outline', autoClose: true }
 *   ]
 * })
 * ```
 */

'use client'

import { create } from 'zustand'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  AlertTriangle,
  HelpCircle,
  Trash2,
  Save,
  X,
  Check,
} from 'lucide-react'
import React, { ReactNode } from 'react'
import { cn } from '@/shared/utils/utils'

// Core Types
export type DialogVariant = 'info' | 'success' | 'error' | 'warning' | 'question' | 'default'
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'

/**
 * Flexible button configuration
 */
export interface DialogButton {
  label: string
  variant?: ButtonVariant
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  autoClose?: boolean  // Close dialog after onClick (default: true)
  className?: string
  icon?: ReactNode
}

/**
 * Base dialog configuration
 */
export interface BaseDialogConfig {
  title: string
  description?: string
  icon?: ReactNode
  variant?: DialogVariant
  className?: string
  onClose?: () => void
  closeOnOverlayClick?: boolean
  buttons?: DialogButton[]
}

/**
 * Alert dialog configuration
 */
export interface AlertConfig extends BaseDialogConfig {
  // Alert defaults to no buttons, but can be customized
  buttons?: DialogButton[]
}

/**
 * Confirm dialog configuration  
 */
export interface ConfirmConfig extends Omit<BaseDialogConfig, 'variant'> {
  // Confirm defaults to Confirm/Cancel, but can be fully customized
  onConfirm?: () => void
  onCancel?: () => void
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  buttons?: DialogButton[]  // If provided, overrides default confirm/cancel
  variant?: ConfirmVariant
}

/**
 * Complex dialog configuration
 */
export interface DialogConfig extends BaseDialogConfig {
  content: ReactNode
  size?: DialogSize
  buttons: DialogButton[]  // Required for complex dialogs
}

// Legacy types for backward compatibility
export type AlertVariant = DialogVariant
export type ConfirmVariant = 'default' | 'critical' | 'warning' | 'success'

// Store interface
interface DialogStore {
  alert?: AlertConfig & { open: boolean }
  confirm?: ConfirmConfig & { open: boolean }
  dialog?: DialogConfig & { open: boolean }
  showAlert: (config: AlertConfig) => void
  showConfirm: (config: ConfirmConfig) => void
  showDialog: (config: DialogConfig) => void
  closeAlert: () => void
  closeConfirm: () => void
  closeDialog: () => void
  clearAll: () => void
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  alert: undefined,
  confirm: undefined,
  dialog: undefined,
  
  showAlert: (config) => {
    set({ alert: { ...config, open: true } })
  },
  
  showConfirm: (config) => {
    set({ confirm: { ...config, open: true } })
  },
  
  showDialog: (config) => {
    set({ dialog: { ...config, open: true } })
  },
  
  closeAlert: () => {
    const { alert } = get()
    if (alert?.onClose) {
      try {
        alert.onClose()
      } catch (error) {
        console.error('Error in alert onClose:', error)
      }
    }
    set({ alert: undefined })
  },
  
  closeConfirm: () => {
    const { confirm } = get()
    if (confirm?.onCancel) {
      try {
        confirm.onCancel()
      } catch (error) {
        console.error('Error in confirm onCancel:', error)
      }
    }
    set({ confirm: undefined })
  },
  
  closeDialog: () => {
    const { dialog } = get()
    if (dialog?.onClose) {
      try {
        dialog.onClose()
      } catch (error) {
        console.error('Error in dialog onClose:', error)
      }
    }
    set({ dialog: undefined })
  },
  
  clearAll: () => {
    set({ alert: undefined, confirm: undefined, dialog: undefined })
  },
}))

// Icons and styling remain the same
const variantIconMap: Record<DialogVariant, ReactNode> = {
  info: <Info className="h-5 w-5 text-blue-600" />,
  success: <Check className="h-5 w-5 text-green-600" />,
  error: <X className="h-5 w-5 text-red-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  question: <HelpCircle className="h-5 w-5 text-blue-600" />,
  default: <Info className="h-5 w-5 text-blue-600" />,
}

const confirmVariantIconMap: Record<ConfirmVariant, ReactNode> = {
  default: <HelpCircle className="h-5 w-5 text-blue-600" />,
  critical: <AlertTriangle className="h-5 w-5 text-red-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  success: <Check className="h-5 w-5 text-green-600" />,
}

const variantStyles: Record<DialogVariant, string> = {
  info: 'border-l-blue-500',
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  question: 'border-l-blue-500',
  default: 'border-l-gray-500',
}

const confirmVariantStyles: Record<ConfirmVariant, string> = {
  default: 'border-l-blue-500',
  critical: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  success: 'border-l-green-500',
}

const sizeStyles: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full w-full mx-4',
}

/**
 * Show an alert dialog
 * @param config - Alert configuration or string message
 */
export function alert(config: string | AlertConfig): void {
  const show = useDialogStore.getState().showAlert

  if (typeof config === 'string') {
    show({
      title: 'Alert',
      description: config,
      variant: 'info',
      buttons: [{ label: 'OK', variant: 'default', autoClose: true }]
    })
  } else {
    // If no buttons specified, add default close button
    const finalConfig = {
      variant: 'info' as DialogVariant,
      buttons: config.buttons || [{ label: 'OK', variant: 'default' as ButtonVariant, autoClose: true }],
      ...config
    }
    show(finalConfig)
  }
}

/**
 * Show a confirmation dialog
 * @param config - Confirmation configuration
 */
export function confirm(config: ConfirmConfig): void {
  const show = useDialogStore.getState().showConfirm
  
  // If custom buttons provided, use them; otherwise use default confirm/cancel
  if (!config.buttons) {
    const finalConfig = {
      variant: 'default' as ConfirmVariant,
      buttons: [
        ...(config.showCancel !== false ? [{
          label: config.cancelLabel || 'Cancel',
          variant: 'outline' as ButtonVariant,
          onClick: config.onCancel,
          autoClose: true
        }] : []),
        {
          label: config.confirmLabel || 'Continue',
          variant: 'default' as ButtonVariant,
          onClick: config.onConfirm,
          autoClose: true
        }
      ],
      ...config
    }
    show(finalConfig)
  } else {
    show({
      variant: 'default' as ConfirmVariant,
      ...config
    })
  }
}

/**
 * Show a complex dialog with custom content
 * @param config - Dialog configuration
 */
export function dialog(config: DialogConfig): void {
  const show = useDialogStore.getState().showDialog
  
  const finalConfig = {
    variant: 'default' as DialogVariant,
    size: 'md' as DialogSize,
    ...config
  }
  
  show(finalConfig)
}

/**
 * Promise-based alert
 * @param config - Alert configuration or string message
 * @returns Promise that resolves when dialog is closed
 */
export function alertAsync(config: string | AlertConfig): Promise<void> {
  return new Promise((resolve) => {
    const configObj = typeof config === 'string' 
      ? { title: 'Alert', description: config, variant: 'info' as DialogVariant }
      : config

    alert({
      ...configObj,
      onClose: () => {
        configObj.onClose?.()
        resolve()
      },
    })
  })
}

/**
 * Promise-based confirmation
 * @param config - Confirmation configuration
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
export function confirmAsync(config: ConfirmConfig): Promise<boolean> {
  return new Promise((resolve) => {
    confirm({
      ...config,
      onConfirm: () => {
        config.onConfirm?.()
        resolve(true)
      },
      onCancel: () => {
        config.onCancel?.()
        resolve(false)
      },
    })
  })
}

// Helper functions removed - use main alert() and confirm() functions with explicit variants
// Preferred pattern: 
// alert({ variant: 'error', title: 'Error', description: 'Something went wrong' })
// confirm({ variant: 'warning', title: 'Confirm', description: 'Are you sure?', onConfirm: () => {} })

/**
 * Render dialog buttons
 */
function renderButtons(buttons: DialogButton[], onClose: () => void): ReactNode {
  if (!buttons || buttons.length === 0) return null

  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
      {buttons.map((button, index) => (
        <Button
          key={index}
          variant={button.variant || 'default'}
          disabled={button.disabled || button.loading}
          className={cn('min-w-20', button.className)}
          onClick={() => {
            try {
              button.onClick?.()
            } catch (error) {
              console.error('Error in button onClick:', error)
            } finally {
              if (button.autoClose !== false) {
                onClose()
              }
            }
          }}
        >
          {button.loading && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
          )}
          {button.icon && <span className="mr-2">{button.icon}</span>}
          {button.label}
        </Button>
      ))}
    </div>
  )
}

/**
 * Dialog overlay component that renders all dialogs
 * Must be included in your app layout
 */
export function DialogOverlay(): React.JSX.Element {
  const { alert, confirm, dialog, closeAlert, closeConfirm, closeDialog } = useDialogStore()

  return (
    <>
      {/* Alert Dialog */}
      {alert && (
        <AlertDialog open onOpenChange={closeAlert}>
          <AlertDialogContent className={cn(
            'max-w-md border-l-4 !bg-white dark:!bg-gray-800 !rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
            variantStyles[alert.variant || 'info'],
            alert.className
          )}>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {alert.icon || variantIconMap[alert.variant || 'info']}
                </div>
                <div className="flex-1 min-w-0">
                  <AlertDialogTitle className="text-base font-semibold leading-6">
                    {alert.title}
                  </AlertDialogTitle>
                  {alert.description && (
                    <AlertDialogDescription className="mt-2 text-sm leading-5">
                    {alert.description}
                  </AlertDialogDescription>
                  )}
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {renderButtons(alert.buttons || [], closeAlert)}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <AlertDialog open onOpenChange={closeConfirm}>
          <AlertDialogContent className={cn(
            'max-w-md border-l-4 !bg-white dark:!bg-gray-800 !rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
            confirmVariantStyles[confirm.variant || 'default'],
            confirm.className
          )}>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {confirm.icon || confirmVariantIconMap[confirm.variant || 'default']}
                </div>
                <div className="flex-1 min-w-0">
                  <AlertDialogTitle className="text-base font-semibold leading-6">
                {confirm.title}
              </AlertDialogTitle>
                  {confirm.description && (
                    <AlertDialogDescription className="mt-2 text-sm leading-5">
                      {confirm.description}
                    </AlertDialogDescription>
                  )}
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {renderButtons(confirm.buttons || [], closeConfirm)}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Complex Dialog */}
      {dialog && (
        <AlertDialog open onOpenChange={closeDialog}>
          <AlertDialogContent className={cn(
            'border-l-4 !bg-white dark:!bg-gray-800 !rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
            sizeStyles[dialog.size || 'md'],
            variantStyles[dialog.variant || 'default'],
            dialog.className
          )}>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {dialog.icon || variantIconMap[dialog.variant || 'default']}
                </div>
                <div className="flex-1 min-w-0">
                  <AlertDialogTitle className="text-base font-semibold leading-6">
                    {dialog.title}
                  </AlertDialogTitle>
                  {dialog.description && (
                    <AlertDialogDescription className="mt-2 text-sm leading-5">
                      {dialog.description}
                    </AlertDialogDescription>
                  )}
                </div>
              </div>
            </AlertDialogHeader>
            
            {/* Custom Content */}
            <div className="py-4">
              {dialog.content}
            </div>
            
            <AlertDialogFooter>
              {renderButtons(dialog.buttons, closeDialog)}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

/**
 * Clear all open dialogs
 */
export const clearAllDialogs = () => useDialogStore.getState().clearAll()

// Legacy exports removed - use main alert() and confirm() functions with explicit variants
// Preferred patterns:
// alert({ variant: 'error', title: 'Error', description: 'Something went wrong' })
// confirm({ variant: 'warning', title: 'Confirm', description: 'Are you sure?', onConfirm: () => {} })
