'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface StatusBadgeProps extends HTMLAttributes<HTMLDivElement> {
  isActive?: boolean;
  activeText?: string;
  inactiveText?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: React.ReactNode;
}

export function StatusBadge({ 
  isActive, 
  activeText = 'Active', 
  inactiveText = 'Inactive',
  variant,
  children,
  className,
  ...props
}: StatusBadgeProps) {

  if (typeof isActive !== 'boolean') {
    // If isActive is not provided, render children with a default badge
    return (
      <Badge variant={variant || 'default'} className={cn('capitalize', className)} {...props}>
        {children}
      </Badge>
    );
  }

  const text = isActive ? activeText : inactiveText;
  const badgeVariant = variant ?? (isActive ? 'default' : 'secondary');

  return (
    <Badge variant={badgeVariant} className={cn('capitalize', className)} {...props}>
      {text}
    </Badge>
  );
}
