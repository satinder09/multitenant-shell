// apps/frontend/app/layout.tsx

import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

import './globals.css';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/context/theme-provider';
import { AuthProvider } from '@/context/AuthContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { DialogOverlay } from '@/utils/ui/dialogUtils';
import { AppSheetOverlay } from '@/utils/ui/sheetUtils';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <AuthenticatedLayout>
              {children}
            </AuthenticatedLayout>
          </AuthProvider>
          <DialogOverlay />
          <Toaster richColors position="top-right" />
          <AppSheetOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
