// apps/frontend/app/layout.tsx

import './globals.css';
import { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/context/theme-provider';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { DialogOverlay } from '@/shared/utils/ui/dialogUtils';
import { AppSheetOverlay } from '@/shared/utils/ui/sheetUtils';
import { PlatformProvider } from '@/context/PlatformContext';
import ContextAwareLayout from '@/components/layouts/ContextAwareLayout';
import ErrorBoundary from '@/components/common/ErrorBoundary';


interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <PlatformProvider>
                <ContextAwareLayout>
                  {children}
                </ContextAwareLayout>
              </PlatformProvider>
            </AuthProvider>
            <DialogOverlay />
            <Toaster richColors position="top-right" />
            <AppSheetOverlay />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
