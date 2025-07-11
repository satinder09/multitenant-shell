/**
 * 🚀 Simplified Browser API Hook
 * 
 * This hook provides a clean interface to both sync and background API calls.
 * Uses the default toast system for automatic progress and completion notifications.
 */

import { useCallback } from 'react';
import { useOperationProgress } from './useOperationProgress';
import { browserApi, BackgroundOptions } from '@/shared/services/api-client';

export interface UseBrowserApiOptions {
  autoCleanup?: boolean;
  defaultToastOptions?: Partial<BackgroundOptions>;
}

export function useBrowserApi(options: UseBrowserApiOptions = {}) {
  // Setup WebSocket progress handling for real-time updates
  const { isConnected } = useOperationProgress();

  // Create API methods with default toast support
  const api = {
    // Background methods with automatic toast support
    background: {
      post: async <T = any>(url: string, data?: any, options?: BackgroundOptions) => {
        const operationId = options?.operationId ?? `${url.replace(/\W+/g, '-')}-${Date.now()}`;
        return browserApi.background.post<T>(url, data, {
          ...options,
          operationId,
        });
      },
      
      patch: async <T = any>(url: string, data?: any, options?: BackgroundOptions) => {
        const operationId = options?.operationId ?? `${url.replace(/\W+/g, '-')}-${Date.now()}`;
        return browserApi.background.patch<T>(url, data, {
          ...options,
          operationId,
        });
      },
      
      delete: async <T = any>(url: string, options?: BackgroundOptions) => {
        const operationId = options?.operationId ?? `${url.replace(/\W+/g, '-')}-${Date.now()}`;
        return browserApi.background.delete<T>(url, {
          ...options,
          operationId,
        });
      }
    },
    
    // Regular API methods (pass through to browserApi)
    get: browserApi.get,
    post: browserApi.post,
    put: browserApi.put,
    patch: browserApi.patch,
    delete: browserApi.delete
  };

  return {
    api,
    isConnected
  };
}

// Utility for table refresh
export function useTableRefresh(tableName: string) {
  const handleRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent(`table-refresh:${tableName}`));
  }, [tableName]);
  
  return handleRefresh;
} 