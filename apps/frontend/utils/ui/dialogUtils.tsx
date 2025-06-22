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
import { Info, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AlertVariant = 'info' | 'success' | 'error' | 'warning'
type ConfirmVariant = 'default' | 'critical'

interface AlertConfig {
  open: boolean
  variant: AlertVariant
  title: string
  description: string
  onClose?: () => void
}

interface ConfirmConfig {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  onConfirm?: () => void
  onCancel?: () => void
}

type DialogStore = {
  alert?: AlertConfig
  confirm?: ConfirmConfig
  showAlert: (config: Omit<AlertConfig, 'open'>) => void
  showConfirm: (config: Omit<ConfirmConfig, 'open'>) => void
  closeAlert: () => void
  closeConfirm: () => void
}

export const useDialogStore = create<DialogStore>((set) => ({
  alert: undefined,
  confirm: undefined,
  showAlert: (config) => set({ alert: { ...config, open: true } }),
  showConfirm: (config) => set({ confirm: { ...config, open: true } }),
  closeAlert: () => set((state) => {
    state.alert?.onClose?.()
    return { alert: undefined }
  }),
  closeConfirm: () => set((state) => {
    state.confirm?.onCancel?.()
    return { confirm: undefined }
  }),
}))

export function alert(config: string | Omit<AlertConfig, 'open'>) {
  const show = useDialogStore.getState().showAlert

  if (typeof config === 'string') {
    show({
      title: 'Alert',
      description: config,
      variant: 'info',
    })
  } else {
    show(config)
  }
}


export function confirm(config: Omit<ConfirmConfig, 'open'>) {
  useDialogStore.getState().showConfirm(config)
}

const iconMap: Record<AlertVariant, ReactNode> = {
  info: <Info className="h-5 w-5 text-blue-600" />,
  success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  error: <ShieldAlert className="h-5 w-5 text-red-600" />,
}

export function DialogOverlay() {
  const { alert, confirm, closeAlert, closeConfirm } = useDialogStore()

  return (
    <>
      {alert && (
        <AlertDialog open onOpenChange={closeAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                <div className="mt-1">{iconMap[alert.variant]}</div>
                <div>
                  <AlertDialogTitle className="text-base font-semibold">
                    {alert.title}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {alert.description}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  closeAlert()
                  alert.onClose?.()
                }}
                className={alert.variant === 'error' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {confirm && (
        <AlertDialog open onOpenChange={closeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold">
                {confirm.title}
              </AlertDialogTitle>
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  confirm.onCancel?.()
                  closeConfirm()
                }}
              >
                {confirm.cancelLabel || 'Cancel'}
              </AlertDialogCancel>
              <Button
                onClick={() => {
                  confirm.onConfirm?.()
                  useDialogStore.setState({ confirm: undefined })
                }}
                variant={confirm.variant === 'critical' ? 'destructive' : 'default'}
              >
                {confirm.confirmLabel || 'Continue'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
