'use client'

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/utils/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  count?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'bordered';
}

export function SectionHeader({
  title,
  description,
  count,
  actions,
  children,
  className,
  size = 'md',
  variant = 'default'
}: SectionHeaderProps) {
  const getTitleClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-lg font-semibold tracking-tight';
      case 'lg':
        return 'text-3xl font-bold tracking-tight';
      default:
        return 'text-2xl font-bold tracking-tight';
    }
  };

  const getDescriptionClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm text-muted-foreground';
      case 'lg':
        return 'text-lg text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getContainerClasses = () => {
    const baseClasses = 'space-y-4';
    
    switch (variant) {
      case 'subtle':
        return cn(baseClasses, 'pb-4');
      case 'bordered':
        return cn(baseClasses, 'pb-6 border-b border-border');
      default:
        return cn(baseClasses, 'pb-6');
    }
  };

  return (
    <div className={cn(getContainerClasses(), className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h1 className={getTitleClasses()}>
              {title}
            </h1>
            {count !== undefined && (
              <Badge 
                variant="secondary" 
                className="h-6 px-2 text-sm font-medium"
              >
                {count}
              </Badge>
            )}
          </div>
          
          {description && (
            <p className={getDescriptionClasses()}>
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
