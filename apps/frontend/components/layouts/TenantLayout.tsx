import React from 'react';
import BaseLayout from './BaseLayout';
import TenantSidebar from './TenantSidebar';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseLayout sidebar={<TenantSidebar />}>
      {children}
    </BaseLayout>
  );
} 