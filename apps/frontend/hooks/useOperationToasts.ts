'use client';
import { useRef } from 'react';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { useOperationProgress } from './useOperationProgress';

export function useOperationToasts(userId: string) {
  const activeToastsRef = useRef<Map<string, string | number>>(new Map());
  
  const { isConnected } = useOperationProgress(userId, {
    onProgress: (event) => {
      const { operationId, operationType, percentage, message } = event.data;
      
      // Format the title with progress percentage
      const title = percentage !== undefined 
        ? `${operationType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${percentage}%`
        : operationType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Create or update toast
      const existingToastId = activeToastsRef.current.get(operationId);
      
      if (!existingToastId) {
        // Create new loading toast
        const newToastId = toastNotify({
          variant: 'loading',
          title,
          description: message || 'Processing...',
          duration: Infinity,
          sticky: true,
        });
        activeToastsRef.current.set(operationId, newToastId);
      } else {
        // Update existing toast (note: toastNotify doesn't support updating existing toasts)
        // We'll create a new one and dismiss the old one
        toastNotify({
          variant: 'loading',
          title,
          description: message || 'Processing...',
          duration: Infinity,
          sticky: true,
        });
      }
    },
    
    onComplete: (event) => {
      const { operationId, operationType, result } = event.data;
      
      // Remove from active toasts
      activeToastsRef.current.delete(operationId);
      
      // Show success toast
      toastNotify({
        variant: 'success',
        title: event.metadata?.message || `${operationType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Completed`,
        description: 'Operation completed successfully',
        duration: 3000,
        showProgress: true,
      });
      
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('websocket:operation:complete', {
        detail: {
          operationId,
          operationType,
          result,
          metadata: event.metadata,
        },
      }));
      
      // Dispatch table refresh events
      if (event.metadata?.tablesToRefresh) {
        event.metadata.tablesToRefresh.forEach((tableName: string) => {
          window.dispatchEvent(new CustomEvent(`table-refresh:${tableName}`, {
            detail: { operationId, operationType, result },
          }));
        });
      }
    },
    
    onError: (event) => {
      const { operationId, operationType, error } = event.data;
      
      // Remove from active toasts
      activeToastsRef.current.delete(operationId);
      
      // Show error toast
      toastNotify({
        variant: 'error',
        title: event.metadata?.message || `${operationType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Failed`,
        description: error || 'An error occurred',
        duration: 5000,
        showProgress: true,
      });
    }
  });
  
  return { isConnected };
} 