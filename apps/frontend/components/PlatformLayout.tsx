import React from 'react';
import BaseLayout from './BaseLayout';
import PlatformSidebar from './PlatformSidebar';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseLayout
      sidebar={<PlatformSidebar />}
      className="h-screen" // Platform uses h-screen instead of min-h-screen
    >
      {children}
    </BaseLayout>
  );
} 