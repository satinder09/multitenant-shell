'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  children?: ReactNode // right-side actions like buttons
  className?: string
}

export default function SectionHeader({
  title,
  description,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-2', className)}>
      <div>
        <h2 className="text-lg font-semibold leading-tight tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
