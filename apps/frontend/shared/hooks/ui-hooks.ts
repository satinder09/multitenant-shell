'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { storage, debounce, throttle } from '@/shared/utils';
import type { 
  UIState, 
  TableState, 
  FormState, 
  ModalState, 
  ToastMessage,
  QueryOptions,
  MutationOptions 
} from '../types';

// Local storage hook
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = storage.get(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.set(key, valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// Session storage hook
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// Debounced value hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttled callback hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [callback, delay]
  );

  return throttledCallback as T;
}

// Previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// Toggle hook
export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(prev => !prev), []);
  const setToggle = useCallback((value: boolean) => setValue(value), []);
  
  return [value, toggle, setToggle];
}

// Counter hook
export function useCounter(initialValue: number = 0): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
} {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => setCount(prev => prev + 1), []);
  const decrement = useCallback(() => setCount(prev => prev - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  const set = useCallback((value: number) => setCount(value), []);
  
  return { count, increment, decrement, reset, set };
}

// Array hook
export function useArray<T>(initialValue: T[] = []): {
  items: T[];
  add: (item: T) => void;
  remove: (index: number) => void;
  update: (index: number, item: T) => void;
  clear: () => void;
  set: (items: T[]) => void;
} {
  const [items, setItems] = useState<T[]>(initialValue);
  
  const add = useCallback((item: T) => {
    setItems(prev => [...prev, item]);
  }, []);
  
  const remove = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const update = useCallback((index: number, item: T) => {
    setItems(prev => prev.map((existingItem, i) => i === index ? item : existingItem));
  }, []);
  
  const clear = useCallback(() => {
    setItems([]);
  }, []);
  
  const set = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);
  
  return { items, add, remove, update, clear, set };
}

// Async hook
export function useAsync<T, E = Error>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: E | null;
  execute: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<E | null>(null);
  
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      setError(err as E);
    } finally {
      setLoading(false);
    }
  }, dependencies);
  
  useEffect(() => {
    execute();
  }, [execute]);
  
  return { data, loading, error, execute };
}



// UI state hook
export function useUIState(initialState?: Partial<UIState>): UIState & {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  reset: () => void;
} {
  const [state, setState] = useState<UIState>({
    isLoading: false,
    error: null,
    success: null,
    ...initialState
  });
  
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);
  
  const setSuccess = useCallback((success: string | null) => {
    setState(prev => ({ ...prev, success, error: null }));
  }, []);
  
  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, success: null });
  }, []);
  
  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    reset
  };
}

// Table state hook
export function useTableState<T>(initialData: T[] = []): TableState<T> & {
  setData: (data: T[]) => void;
  setPagination: (pagination: Partial<TableState<T>['pagination']>) => void;
  setSorting: (sorting: TableState<T>['sorting']) => void;
  setFilters: (filters: Record<string, any>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
} {
  const [state, setState] = useState<TableState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
    success: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    },
    sorting: null,
    filters: {}
  });
  
  const setData = useCallback((data: T[]) => {
    setState(prev => ({ ...prev, data }));
  }, []);
  
  const setPagination = useCallback((pagination: Partial<TableState<T>['pagination']>) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, ...pagination }
    }));
  }, []);
  
  const setSorting = useCallback((sorting: TableState<T>['sorting']) => {
    setState(prev => ({ ...prev, sorting }));
  }, []);
  
  const setFilters = useCallback((filters: Record<string, any>) => {
    setState(prev => ({ ...prev, filters }));
  }, []);
  
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);
  
  const reset = useCallback(() => {
    setState({
      data: [],
      isLoading: false,
      error: null,
      success: null,
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      sorting: null,
      filters: {}
    });
  }, []);
  
  return {
    ...state,
    setData,
    setPagination,
    setSorting,
    setFilters,
    setLoading,
    setError,
    reset
  };
}

// Form state hook
export function useFormState<T extends Record<string, any>>(
  initialData: T
): FormState<T> & {
  setData: (data: Partial<T>) => void;
  setField: (field: keyof T, value: any) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
} {
  const [state, setState] = useState<FormState<T>>({
    data: initialData,
    isDirty: false,
    isSubmitting: false,
    isLoading: false,
    error: null,
    success: null,
    validationErrors: {}
  });
  
  const setData = useCallback((newData: Partial<T>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...newData },
      isDirty: true
    }));
  }, []);
  
  const setField = useCallback((field: keyof T, value: any) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      isDirty: true
    }));
  }, []);
  
  const setValidationErrors = useCallback((validationErrors: Record<string, string>) => {
    setState(prev => ({ ...prev, validationErrors }));
  }, []);
  
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState(prev => ({ ...prev, isSubmitting }));
  }, []);
  
  const reset = useCallback(() => {
    setState({
      data: initialData,
      isDirty: false,
      isSubmitting: false,
      isLoading: false,
      error: null,
      success: null,
      validationErrors: {}
    });
  }, [initialData]);
  
  return {
    ...state,
    setData,
    setField,
    setValidationErrors,
    setSubmitting,
    reset
  };
}

// Modal state hook
export function useModal(initialState?: Partial<ModalState>): ModalState & {
  open: (data?: any) => void;
  close: () => void;
  setTitle: (title: string) => void;
  setSize: (size: ModalState['size']) => void;
} {
  const [state, setState] = useState<ModalState>({
    isOpen: false,
    ...initialState
  });
  
  const open = useCallback((data?: any) => {
    setState(prev => ({ ...prev, isOpen: true, data }));
  }, []);
  
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, data: undefined }));
  }, []);
  
  const setTitle = useCallback((title: string) => {
    setState(prev => ({ ...prev, title }));
  }, []);
  
  const setSize = useCallback((size: ModalState['size']) => {
    setState(prev => ({ ...prev, size }));
  }, []);
  
  return {
    ...state,
    open,
    close,
    setTitle,
    setSize
  };
}

// Toast hook
export function useToast(): {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
} {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  return {
    toasts,
    addToast,
    removeToast,
    clearToasts
  };
}

// Window size hook
export function useWindowSize(): {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    ...windowSize,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
  };
}

// Click outside hook
export function useClickOutside<T extends HTMLElement>(
  handler: () => void
): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handler]);
  
  return ref;
}

// Keyboard shortcut hook
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {}
): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const pressedKeys: string[] = [];
      
      if (event.ctrlKey) pressedKeys.push('ctrl');
      if (event.shiftKey) pressedKeys.push('shift');
      if (event.altKey) pressedKeys.push('alt');
      if (event.metaKey) pressedKeys.push('meta');
      
      pressedKeys.push(event.key.toLowerCase());
      
      const keysMatch = keys.every(key => pressedKeys.includes(key.toLowerCase()));
      
      if (keysMatch) {
        if (options.preventDefault) {
          event.preventDefault();
        }
        if (options.stopPropagation) {
          event.stopPropagation();
        }
        callback();
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keys, callback, options]);
}

// Intersection observer hook
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement | null>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
    };
  }, [options]);
  
  return [ref, isIntersecting];
} 