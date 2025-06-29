// Generic API query hook for consistent data fetching
import { useState, useEffect, useCallback } from 'react';
import { ApiClientError } from '../base-client';

export interface UseApiQueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  retry?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiClientError) => void;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiClientError | null;
  refetch: () => Promise<void>;
  isRefetching: boolean;
}

export function useApiQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: UseApiQueryOptions = {}
): UseApiQueryResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval,
    retry = 3,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const executeQuery = useCallback(async (isRefetch = false) => {
    if (!enabled) return;

    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    
    setIsError(false);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      setRetryCount(0);
      onSuccess?.(result);
    } catch (err) {
      const apiError = err instanceof ApiClientError ? err : new ApiClientError({
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        statusCode: 500,
      });
      
      setIsError(true);
      setError(apiError);
      onError?.(apiError);

      // Retry logic
      if (retryCount < retry) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          executeQuery(isRefetch);
        }, Math.pow(2, retryCount) * 1000);
        return;
      }
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [queryFn, enabled, retry, retryCount, onSuccess, onError]);

  const refetch = useCallback(() => executeQuery(true), [executeQuery]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      executeQuery();
    }
  }, [enabled, ...queryKey]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (enabled && !isLoading && !isRefetching) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, isLoading, isRefetching, refetch]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      if (!isLoading && !isRefetching) {
        refetch();
      }
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, isLoading, isRefetching, refetch]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  };
} 