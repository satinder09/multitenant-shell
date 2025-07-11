'use client';
import { useOperationProgress } from './useOperationProgress';

export function useTableRefresh(userId: string, tableName: string, onRefresh: () => void) {
  const { isConnected } = useOperationProgress(userId, {
    onComplete: (event) => {
      if (event.metadata?.tablesToRefresh?.includes(tableName)) {
        onRefresh();
      }
    }
  });
  
  return { isConnected };
} 