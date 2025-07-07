import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider';
import { getCurrentDomain } from '@/config/domain-manager';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const domain = getCurrentDomain();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <RootProvider
          search={{
            enabled: true,
          }}
          theme={{
            enabled: true,
            defaultTheme: 'light',
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const domain = getCurrentDomain();
  
  return {
    title: {
      default: domain.seo.title,
      template: `%s - ${domain.branding.name}`,
    },
    description: domain.seo.description,
    keywords: domain.seo.keywords,
    openGraph: {
      title: domain.seo.title,
      description: domain.seo.description,
      images: domain.seo.ogImage ? [domain.seo.ogImage] : undefined,
      siteName: domain.branding.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: domain.seo.title,
      description: domain.seo.description,
      images: domain.seo.ogImage ? [domain.seo.ogImage] : undefined,
    },
  };
} 