'use client'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface FormRowProps {
  id: string
  label: string
  layout?: 'vertical' | 'horizontal'
  required?: boolean
  labelClassName?: string
  className?: string
  children: ReactNode
}

export default function FormRow({
  id,
  label,
  layout = 'vertical',
  required,
  labelClassName,
  className,
  children,
}: FormRowProps) {
  const isHorizontal = layout === 'horizontal'

  return (
    <div
      className={cn(
        'w-full',
        isHorizontal ? 'grid grid-cols-4 items-center gap-4' : 'space-y-1',
        className
      )}
    >
      <Label
        htmlFor={id}
        className={cn(isHorizontal ? 'text-right' : '', labelClassName)}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {/* Horizontal: children in col-span-3, Vertical: stacked naturally */}
      <div className={isHorizontal ? 'col-span-3' : ''}>{children}</div>
    </div>
  )
}
