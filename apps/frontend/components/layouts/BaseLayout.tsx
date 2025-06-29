import React, { ReactNode } from 'react';
import Header from './Header';
import { ImpersonationBanner } from '@/components/features/ImpersonationBanner';

export interface BaseLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  className?: string;
  mainClassName?: string;
  contentClassName?: string;
  showImpersonationBanner?: boolean;
}

export default function BaseLayout({
  children,
  sidebar,
  className = '',
  mainClassName = '',
  contentClassName = '',
  showImpersonationBanner = true,
}: BaseLayoutProps) {
  return (
    <div className={`flex min-h-screen font-sans bg-gray-50 ${className}`}>
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        {showImpersonationBanner && <ImpersonationBanner />}
        <Header />
        <main className={`flex-1 p-6 overflow-auto ${mainClassName}`}>
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-full ${contentClassName}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Additional layout variants for specific use cases
export interface LayoutConfig {
  showSidebar?: boolean;
  showHeader?: boolean;
  showImpersonationBanner?: boolean;
  sidebarWidth?: 'default' | 'narrow' | 'wide';
  headerHeight?: 'default' | 'compact' | 'tall';
  contentPadding?: 'default' | 'none' | 'small' | 'large';
  backgroundColor?: string;
}

export interface ConfigurableLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  config?: LayoutConfig;
  className?: string;
}

export function ConfigurableLayout({
  children,
  sidebar,
  config = {},
  className = '',
}: ConfigurableLayoutProps) {
  const {
    showSidebar = true,
    showHeader = true,
    showImpersonationBanner = true,
    sidebarWidth = 'default',
    headerHeight = 'default',
    contentPadding = 'default',
    backgroundColor = 'bg-gray-50',
  } = config;

  const sidebarWidthClasses = {
    default: 'w-64',
    narrow: 'w-48',
    wide: 'w-80',
  };

  const headerHeightClasses = {
    default: 'h-16',
    compact: 'h-12',
    tall: 'h-20',
  };

  const contentPaddingClasses = {
    default: 'p-6',
    none: 'p-0',
    small: 'p-3',
    large: 'p-8',
  };

  return (
    <div className={`flex min-h-screen font-sans ${backgroundColor} ${className}`}>
      {showSidebar && sidebar && (
        <div className={`${sidebarWidthClasses[sidebarWidth]} flex-shrink-0`}>
          {sidebar}
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {showImpersonationBanner && <ImpersonationBanner />}
        {showHeader && (
          <div className={headerHeightClasses[headerHeight]}>
            <Header />
          </div>
        )}
        <main className={`flex-1 overflow-auto ${contentPaddingClasses[contentPadding]}`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Layout error boundary
export interface LayoutErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface LayoutErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LayoutErrorBoundaryComponent extends React.Component<
  LayoutErrorBoundaryProps,
  LayoutErrorBoundaryState
> {
  constructor(props: LayoutErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LayoutErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Layout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                There was an error loading the page. Please try refreshing.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export function LayoutErrorBoundary({ children, fallback }: LayoutErrorBoundaryProps) {
  return (
    <LayoutErrorBoundaryComponent fallback={fallback}>
      {children}
    </LayoutErrorBoundaryComponent>
  );
} 