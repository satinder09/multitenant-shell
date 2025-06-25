'use client';
import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/10 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-8 bg-muted/10 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 