'use client';
import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import ContextAwareLayout from './ContextAwareLayout';

export default function ConditionalLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  
  // Pages that should not have the layout wrapper
  const publicPages = ['/login'];
  const isPublicPage = publicPages.includes(pathname);
  
  // If it's a public page or user is not authenticated, render without layout
  if (isPublicPage || !isAuthenticated) {
    return <>{children}</>;
  }
  
  // For authenticated pages, use the context-aware layout
  return <ContextAwareLayout>{children}</ContextAwareLayout>;
} 