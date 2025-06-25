'use client';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import ContextAwareLayout from '@/components/ContextAwareLayout';

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  console.log('[LayoutWrapper] Rendering with pathname:', pathname);
  
  // If on /login, render children directly (no sidebar/layout)
  if (pathname === '/login') {
    console.log('[LayoutWrapper] Login page detected, rendering children directly');
    return <>{children}</>;
  }
  
  // Otherwise, wrap in context-aware layout
  console.log('[LayoutWrapper] Non-login page, wrapping in ContextAwareLayout');
  return (
    <ContextAwareLayout>
      {children}
    </ContextAwareLayout>
  );
} 