'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'done' | 'in-progress' | 'pending' | 'error' | string;
  text?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ 
  status, 
  text, 
  showIcon = true, 
  size = 'md' 
}: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
      case 'active':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
          icon: CheckCircle,
          text: text || 'Done'
        };
      case 'in-progress':
      case 'processing':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
          icon: Clock,
          text: text || 'In Progress'
        };
      case 'pending':
      case 'waiting':
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
          icon: AlertCircle,
          text: text || 'Pending'
        };
      case 'error':
      case 'failed':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
          icon: XCircle,
          text: text || 'Error'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: '',
          icon: AlertCircle,
          text: text || status
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'h-5 px-2 text-xs',
    md: 'h-6 px-3 text-sm',
    lg: 'h-8 px-4 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        sizeClasses[size],
        config.className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.text}
    </Badge>
  );
}
