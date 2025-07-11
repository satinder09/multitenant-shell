'use client';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from './useWebSocket';
import { useEffect } from 'react';

export interface OperationEvent {
  type: 'operation:progress' | 'operation:complete' | 'operation:error';
  data: {
    operationId: string;
    operationType: string;
    stage?: string;
    percentage?: number;
    message?: string;
    result?: any;
    error?: string;
  };
  metadata?: {
    tablesToRefresh?: string[];
    message?: string;
    [key: string]: any;
  };
}

export function useOperationProgress() {
  const { user } = useAuth();
  const userId = user?.id || '';
  
  const { isConnected, subscribe } = useWebSocket(userId);
  
  // Bridge WebSocket events → DOM CustomEvents (used by BackgroundApiClient for toasts)
  useEffect(() => {
    if (!userId) return;

    const progressUnsub = subscribe('operation:progress', (evt) => {
      const id = evt.data?.operationId;
      if (!id) return;
      window.dispatchEvent(new CustomEvent(`operation:${id}:progress`, { detail: evt.data }));
    });

    const completeUnsub = subscribe('operation:complete', (evt) => {
      const id = evt.data?.operationId;
      if (!id) return;
      window.dispatchEvent(new CustomEvent(`operation:${id}:complete`, { detail: evt.data }));
    });

    const errorUnsub = subscribe('operation:error', (evt) => {
      const id = evt.data?.operationId;
      if (!id) return;
      window.dispatchEvent(new CustomEvent(`operation:${id}:error`, { detail: evt.data }));
    });

    return () => {
      progressUnsub();
      completeUnsub();
      errorUnsub();
    };
  }, [userId, subscribe]);
  
  return { isConnected };
} 