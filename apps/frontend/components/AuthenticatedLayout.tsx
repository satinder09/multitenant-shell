'use client';

import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  // If the user is not authenticated, just render the children (e.g., the login page).
  // The middleware already protects routes, so we don't need a loader here.
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If authenticated, render the full dashboard layout with sidebar and header.
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
} 