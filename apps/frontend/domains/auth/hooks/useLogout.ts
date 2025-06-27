'use client';

import { useState } from 'react';
import { useAuth } from './useAuth';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, we should clear the local state
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogout,
    isLoading,
  };
} 