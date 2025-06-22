'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AppSheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export default function AppSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  className,
}: AppSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side={side}
        className={cn('flex flex-col p-6 gap-4', className)}
      >
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {children}
        </div>

        {footer && (
          <div className="space-y-2 pt-4">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
