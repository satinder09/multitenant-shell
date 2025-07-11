'use client';
import { useCallback, useEffect } from 'react';
import { useWebSocket, WebSocketEvent } from './useWebSocket';

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

interface OperationCallbacks {
  onProgress?: (event: OperationEvent) => void;
  onComplete?: (event: OperationEvent) => void;
  onError?: (event: OperationEvent) => void;
}

export function useOperationProgress(userId: string, callbacks?: OperationCallbacks) {
  const { isConnected, subscribe } = useWebSocket(userId);
  
  const handleOperationEvent = useCallback((event: OperationEvent) => {
    switch (event.type) {
      case 'operation:progress':
        callbacks?.onProgress?.(event);
        break;
      case 'operation:complete':
        callbacks?.onComplete?.(event);
        break;
      case 'operation:error':
        callbacks?.onError?.(event);
        break;
    }
  }, [callbacks]);
  
  useEffect(() => {
    // Create wrapper function to convert WebSocketEvent to OperationEvent
    const createEventHandler = (eventType: OperationEvent['type']) => (event: WebSocketEvent) => {
      if (event.type === eventType) {
        const operationEvent: OperationEvent = {
          type: eventType,
          data: event.data || {},
          metadata: event.metadata,
        };
        handleOperationEvent(operationEvent);
      }
    };
    
    const unsubscribeProgress = subscribe('operation:progress', createEventHandler('operation:progress'));
    const unsubscribeComplete = subscribe('operation:complete', createEventHandler('operation:complete'));
    const unsubscribeError = subscribe('operation:error', createEventHandler('operation:error'));
    
    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [subscribe, handleOperationEvent]);
  
  return { isConnected };
} 