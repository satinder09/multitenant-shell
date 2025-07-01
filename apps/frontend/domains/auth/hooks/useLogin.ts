'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import type { LoginFormData } from '@/shared/utils/validation';

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login({
        email: data.email,
        password: data.password,
        // Note: rememberMe functionality would need to be implemented in the backend
      });
      
      // Redirect after successful login
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    handleLogin,
    isLoading,
    error,
    clearError,
  };
} 