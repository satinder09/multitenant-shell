'use client'

import { create } from 'zustand'
import { ReactNode } from 'react'
import AppSheet from '@/components/composite/AppSheet'

type SheetConfig = {
  open: boolean
  title: string
  description?: string
  side?: 'left' | 'right' | 'top' | 'bottom'
  content: ReactNode
  footer?: ReactNode
}

type SheetStore = {
  sheet?: SheetConfig
  openSheet: (config: Omit<SheetConfig, 'open'>) => void
  closeSheet: () => void
}

export const useSheetStore = create<SheetStore>((set) => ({
  sheet: undefined,
  openSheet: (config) => set({ sheet: { ...config, open: true } }),
  closeSheet: () => set({ sheet: undefined }),
}))

export function openSheet(config: Omit<SheetConfig, 'open'>) {
  useSheetStore.getState().openSheet(config)
}

export function closeSheet() {
  useSheetStore.getState().closeSheet()
}

// ✅ Embedded global overlay component
export function AppSheetOverlay() {
  const { sheet, closeSheet } = useSheetStore()

  if (!sheet) return null

  return (
    <AppSheet
      open={sheet.open}
      onClose={closeSheet}
      title={sheet.title}
      description={sheet.description}
      side={sheet.side}
      footer={sheet.footer}
    >
      {sheet.content}
    </AppSheet>
  )
}
