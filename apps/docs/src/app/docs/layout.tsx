import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layout';
import { getCurrentDomain } from '@/config/domain-manager';
import { source } from '@/lib/source';

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  const domain = getCurrentDomain();
  
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: domain.branding.name,
        transparentMode: 'top',
      }}
      sidebar={{
        banner: (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg">
            <p className="text-sm font-medium">
              📚 {domain.branding.name} Documentation
            </p>
            <p className="text-xs opacity-90">
              {domain.seo.description}
            </p>
          </div>
        ),
        collapsible: true,
      }}
    >
      {children}
    </DocsLayout>
  );
} 