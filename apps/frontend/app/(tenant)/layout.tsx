'use client';

import TenantLayout from '@/components/TenantLayout';

export default function TenantRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantLayout>{children}</TenantLayout>;
} 