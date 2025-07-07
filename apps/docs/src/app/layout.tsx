import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { RootProvider } from 'fumadocs-ui/provider';

// Enhanced font configuration for better typography
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  preload: true,
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    'sans-serif'
  ]
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  preload: true,
  fallback: [
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace'
  ]
});

// Enhanced viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
};

// Enhanced metadata for better SEO and typography
export const metadata: Metadata = {
  title: {
    default: 'Multitenant Shell - API Documentation',
    template: '%s | Multitenant Shell'
  },
  description: 'Comprehensive API documentation for the Multitenant Shell application with interactive examples and detailed guides.',
  keywords: [
    'API documentation',
    'Multitenant',
    'Shell',
    'NestJS',
    'REST API',
    'OpenAPI',
    'Swagger',
    'Developer tools'
  ],
  authors: [{ name: 'Multitenant Shell Team' }],
  creator: 'Multitenant Shell Team',
  publisher: 'Multitenant Shell',
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Multitenant Shell - API Documentation',
    description: 'Comprehensive API documentation with interactive examples',
    siteName: 'Multitenant Shell Docs'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multitenant Shell - API Documentation',
    description: 'Comprehensive API documentation with interactive examples'
  },
  other: {
    'theme-color': '#ffffff',
    'color-scheme': 'light dark',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={cn(
        inter.variable,
        jetbrainsMono.variable,
        'scroll-smooth antialiased'
      )}
      suppressHydrationWarning
    >
      <head>
        {/* Enhanced preload hints for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Enhanced meta tags for typography */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Performance hints */}
        <meta name="dns-prefetch" content="//fonts.googleapis.com" />
        <meta name="dns-prefetch" content="//fonts.gstatic.com" />
        
        {/* Enhanced rendering hints */}
        <meta name="renderer" content="webkit" />
        <meta name="force-rendering" content="webkit" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* Font optimization */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical font loading styles */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            }
            
            /* Prevent layout shift during font loading */
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
              font-variant-ligatures: contextual;
              font-feature-settings: 'kern' 1, 'liga' 1, 'clig' 1, 'calt' 1;
            }
            
            /* Enhanced scrolling for better UX */
            html {
              scroll-behavior: smooth;
              scroll-padding-top: 4rem;
            }
            
            /* Smooth transitions for theme changes */
            *, *::before, *::after {
              transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
            }
          `
        }} />
      </head>
      <body 
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          'selection:bg-primary/10 selection:text-primary',
          'scrollbar-thin scrollbar-track-background scrollbar-thumb-muted'
        )}
      >
        {/* Enhanced layout with better spacing and typography */}
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1">
            <RootProvider
              search={{
                enabled: true,
              }}
              theme={{
                enabled: true,
                defaultTheme: 'light',
                storageKey: 'theme',
              }}
            >
              {children}
            </RootProvider>
          </div>
        </div>
      </body>
    </html>
  );
} 