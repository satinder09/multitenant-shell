# 📚 Docs Migration Plan: OpenAI-Inspired Documentation Platform

## 🎯 **Project Overview**

**Current State**: Two separate Next.js applications
- `apps/docs` (port 3001) - Basic Fumadocs documentation
- `apps/frontend` (port 3000) - Main application

**Target State**: Single unified Next.js application with **OpenAI-inspired documentation**
- Premium docs experience at `/docs` in main frontend app
- **Dark sidebar navigation** with clean, hierarchical structure
- **Interactive code examples** with syntax highlighting
- **Beautiful card layouts** for API endpoint showcases
- **Modern typography** and professional color scheme

**Benefits**: 
- 50% faster build times
- **Premium developer experience** matching OpenAI's documentation quality
- Unified design system with professional aesthetics
- Better SEO with integrated sitemap

---

## 🎨 **OpenAI-Inspired Design System with Dark/Light Mode**

### **Dual Theme Color Palette**
```css
/* CSS Variables for Dark/Light Theme Support */
:root {
  /* Light Theme (Default) */
  --sidebar-bg: #ffffff;
  --sidebar-text: #1f2937;
  --sidebar-text-muted: #6b7280;
  --sidebar-border: #e5e7eb;
  --sidebar-hover: #f3f4f6;
  --sidebar-active: #2563eb;

  --content-bg: #ffffff;
  --content-text: #1f2937;
  --content-text-muted: #6b7280;
  --content-border: #e5e7eb;

  --code-bg: #f8fafc;
  --code-border: #e2e8f0;
  --code-text: #334155;

  --card-bg: #ffffff;
  --card-hover: #f9fafb;
  --card-border: #e5e7eb;

  --button-primary: #10b981;
  --button-primary-hover: #059669;
  --button-secondary: #f3f4f6;
  --button-secondary-hover: #e5e7eb;
}

/* Dark Theme */
[data-theme="dark"] {
  --sidebar-bg: #0f0f0f;
  --sidebar-text: #ffffff;
  --sidebar-text-muted: #a1a1a1;
  --sidebar-border: #2a2a2a;
  --sidebar-hover: #1a1a1a;
  --sidebar-active: #2563eb;

  --content-bg: #111111;
  --content-text: #ffffff;
  --content-text-muted: #a1a1a1;
  --content-border: #2a2a2a;

  --code-bg: #1a1a1a;
  --code-border: #2a2a2a;
  --code-text: #e2e8f0;

  --card-bg: #1a1a1a;
  --card-hover: #2a2a2a;
  --card-border: #2a2a2a;

  --button-primary: #10b981;
  --button-primary-hover: #059669;
  --button-secondary: #2a2a2a;
  --button-secondary-hover: #374151;
}

/* Smooth theme transitions */
* {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
```

### **Adaptive Component Styles**
```css
/* Theme-adaptive component styles */
.docs-sidebar {
  background-color: var(--sidebar-bg);
  color: var(--sidebar-text);
  border-color: var(--sidebar-border);
}

.docs-content {
  background-color: var(--content-bg);
  color: var(--content-text);
}

.code-example {
  background-color: var(--code-bg);
  border-color: var(--code-border);
  color: var(--code-text);
}

.api-endpoint-card {
  background-color: var(--card-bg);
  border-color: var(--card-border);
}

.api-endpoint-card:hover {
  background-color: var(--card-hover);
}

/* Theme-adaptive gradients */
.feature-card-light {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.feature-card-dark {
  background: linear-gradient(135deg, #4c1d95 0%, #581c87 100%);
}

/* Method badges with theme support */
[data-theme="light"] .method-get {
  @apply bg-blue-50 text-blue-800 border-blue-200;
}

[data-theme="dark"] .method-get {
  @apply bg-blue-900/50 text-blue-300 border-blue-700;
}

[data-theme="light"] .method-post {
  @apply bg-green-50 text-green-800 border-green-200;
}

[data-theme="dark"] .method-post {
  @apply bg-green-900/50 text-green-300 border-green-700;
}

[data-theme="light"] .method-put {
  @apply bg-orange-50 text-orange-800 border-orange-200;
}

[data-theme="dark"] .method-put {
  @apply bg-orange-900/50 text-orange-300 border-orange-700;
}

[data-theme="light"] .method-delete {
  @apply bg-red-50 text-red-800 border-red-200;
}

[data-theme="dark"] .method-delete {
  @apply bg-red-900/50 text-red-300 border-red-700;
}
```

### **Theme Context & Provider**
```typescript
// lib/docs/theme-context.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('docs-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setResolvedTheme(systemTheme);
        document.documentElement.setAttribute('data-theme', systemTheme);
      }
    };

    if (theme === 'system') {
      handleSystemThemeChange();
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else {
      setResolvedTheme(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }

    // Save theme preference
    localStorage.setItem('docs-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### **Typography Hierarchy**
```css
/* OpenAI-inspired typography */
.docs-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--content-text);
  margin-bottom: 1rem;
}

.docs-subtitle {
  font-size: 1.125rem;
  color: var(--content-text-muted);
  line-height: 1.6;
  margin-bottom: 2rem;
}

.docs-section-title {
  font-size: 1.875rem;
  font-weight: 600;
  margin-top: 3rem;
  margin-bottom: 1rem;
}

.docs-code {
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 0.875rem;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 0.5rem;
  padding: 1rem;
}
```

### **Component Design Patterns**

#### **1. Dark Sidebar Navigation (OpenAI Style)**
```typescript
// components/docs/DocsSidebar.tsx
const DocsSidebar = () => (
  <aside className="docs-sidebar">
    <div className="sidebar-header">
      <Logo />
      <SearchBar />
    </div>
    
    <nav className="sidebar-nav">
      <section>
        <h3>GET STARTED</h3>
        <NavItem href="/docs/overview">Overview</NavItem>
        <NavItem href="/docs/quickstart">Quickstart</NavItem>
      </section>
      
      <section>
        <h3>API REFERENCE</h3>
        <NavItem href="/docs/api">Authentication</NavItem>
        <NavItem href="/docs/api/users">Users</NavItem>
        <NavItem href="/docs/api/tenants">Tenants</NavItem>
      </section>
    </nav>
  </aside>
);
```

#### **2. Interactive Code Examples (OpenAI Style)**
```typescript
// components/docs/CodeExample.tsx
const CodeExample = ({ language, code, copyable = true }) => (
  <div className="code-example">
    <div className="code-header">
      <span className="language-tag">{language}</span>
      {copyable && <CopyButton code={code} />}
    </div>
    <pre className="code-content">
      <code className={`language-${language}`}>
        {code}
      </code>
    </pre>
  </div>
);
```

#### **3. Beautiful API Endpoint Cards**
```typescript
// components/docs/ApiEndpointCard.tsx
const ApiEndpointCard = ({ method, endpoint, description }) => (
  <div className="api-endpoint-card group">
    <div className="endpoint-header">
      <Badge className={`method-badge method-${method.toLowerCase()}`}>
        {method}
      </Badge>
      <code className="endpoint-path">{endpoint}</code>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
      {title}
    </h3>
  </div>
);
```

#### **4. Model/Feature Showcase Cards (OpenAI Style)**
```typescript
// components/docs/FeatureCard.tsx
const FeatureCard = ({ title, description, gradient, icon }) => (
  <div className="feature-card group" style={{ background: gradient }}>
    <div className="feature-icon mb-4">
      <Icon className={`h-8 w-8 text-${iconColor}`} />
    </div>
    
    <h3 className="feature-title">{title}</h3>
    <p className="feature-description mb-4">{description}</p>
    
    <ArrowRight className="feature-arrow h-5 w-5 ml-auto group-hover:translate-x-1 transition-transform" />
  </div>
);
```

---

## 🗂️ **Migration Phases**

### **Phase 1: Pre-Migration Assessment** (Day 1)
### **Phase 2: OpenAI-Inspired Architecture Setup** (Day 2)
### **Phase 3: Premium Component Development** (Days 3-4)
### **Phase 4: Content Migration & Enhancement** (Day 5)
### **Phase 5: Interactive Features** (Day 6)
### **Phase 6: Public Documentation & SEO** (Day 7)
### **Phase 7: Testing & Polish** (Day 8)
### **Phase 8: Deployment & Launch** (Day 9)

---

## 📋 **PHASE 1: Pre-Migration Assessment**

### **Step 1.1: Current State Analysis**
```bash
# Document current docs structure
find apps/docs -type f -name "*.tsx" -o -name "*.ts" -o -name "*.mdx" | wc -l
find apps/docs/content -name "*.mdx" | head -10
du -sh apps/docs/

# Analyze frontend UI components for reuse
cd apps/frontend
find components/ui -name "*.tsx" | sort > ../frontend-ui-inventory.txt
```

### **Step 1.2: OpenAI Design Analysis**
```bash
# Create design requirements document
cat > ../openai-design-requirements.md << 'EOF'
# OpenAI-Inspired Design Requirements

## Visual Elements
- [ ] Dark sidebar with light content area
- [ ] Clean, hierarchical navigation structure
- [ ] Interactive code examples with copy functionality
- [ ] Beautiful gradient cards for feature showcases
- [ ] Professional typography with proper hierarchy
- [ ] Smooth animations and hover effects

## Component Requirements
- [ ] Dark sidebar navigation
- [ ] Search functionality
- [ ] Interactive code blocks
- [ ] API endpoint cards
- [ ] Method badges with proper colors
- [ ] Copy-to-clipboard functionality
- [ ] Responsive design for mobile

## Color Scheme
- [ ] Dark sidebar (#0f0f0f)
- [ ] Light content area (#ffffff)
- [ ] Proper contrast ratios
- [ ] Consistent hover states
- [ ] Professional gradient cards
EOF
```

---

## 🏗️ **PHASE 2: OpenAI-Inspired Architecture Setup**

### **Step 2.1: Create OpenAI-Style Directory Structure**
```bash
cd apps/frontend

# Create OpenAI-inspired docs structure
mkdir -p app/docs/{overview,quickstart,api,guides,models}
mkdir -p components/docs/{navigation,code,cards,interactive}
mkdir -p content/docs/{overview,api,guides}
mkdir -p styles/docs
mkdir -p lib/docs
```

### **Step 2.2: Setup Design System**
```bash
# Create OpenAI-inspired global styles
cat > styles/docs/openai-theme.css << 'EOF'
/* OpenAI-Inspired Documentation Styles */

/* Sidebar Styles */
.docs-sidebar {
  @apply w-64 h-screen bg-gray-950 text-white border-r border-gray-800;
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
}

.sidebar-header {
  @apply p-6 border-b border-gray-800;
}

.sidebar-nav {
  @apply p-4 space-y-6;
}

.sidebar-nav h3 {
  @apply text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3;
}

.sidebar-nav-item {
  @apply block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors;
}

.sidebar-nav-item.active {
  @apply text-white bg-blue-600;
}

/* Main Content Styles */
.docs-content {
  @apply ml-64 min-h-screen bg-white;
}

.docs-container {
  @apply max-w-4xl mx-auto px-8 py-12;
}

/* Code Block Styles */
.code-example {
  @apply bg-gray-50 border border-gray-200 rounded-lg overflow-hidden my-6;
}

.code-header {
  @apply flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200;
}

.language-tag {
  @apply text-xs font-mono text-gray-600 uppercase;
}

.code-content {
  @apply p-4 overflow-x-auto;
}

/* API Card Styles */
.api-endpoint-card {
  @apply bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow;
}

.endpoint-header {
  @apply flex items-center gap-3 mb-3;
}

.endpoint-path {
  @apply font-mono text-sm text-gray-700;
}

/* Feature Card Styles */
.feature-card {
  @apply relative p-6 rounded-xl text-white overflow-hidden cursor-pointer transform hover:scale-105 transition-transform;
}

.feature-title {
  @apply text-xl font-semibold mb-2;
}

.feature-description {
  @apply text-white/80 text-sm;
}

/* Method Badge Styles */
.method-badge {
  @apply inline-flex items-center px-2 py-1 rounded text-xs font-semibold uppercase;
}

.method-get {
  @apply bg-blue-100 text-blue-800;
}

.method-post {
  @apply bg-green-100 text-green-800;
}

.method-put {
  @apply bg-orange-100 text-orange-800;
}

.method-delete {
  @apply bg-red-100 text-red-800;
}

/* Search Styles */
.docs-search {
  @apply w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .docs-sidebar {
    @apply transform -translate-x-full transition-transform;
  }
  
  .docs-sidebar.open {
    @apply translate-x-0;
  }
  
  .docs-content {
    @apply ml-0;
  }
}
EOF
```

### **Step 2.3: Create OpenAI-Style Layout**
```bash
cat > app/docs/layout.tsx << 'EOF'
import { DocsSidebar } from '@/components/docs/navigation/DocsSidebar';
import { DocsHeader } from '@/components/docs/navigation/DocsHeader';
import '@/styles/docs/openai-theme.css';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-layout">
      <DocsSidebar />
      <div className="docs-content">
        <DocsHeader />
        <main className="docs-container">
          {children}
        </main>
      </div>
    </div>
  );
}
EOF
```

---

## 🔄 **PHASE 3: Premium Component Development**

### **Step 3.1: Theme-Adaptive Sidebar Navigation**
```bash
# Create adaptive dark/light mode sidebar
cat > components/docs/navigation/DocsSidebar.tsx << 'EOF'
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '@/lib/docs/theme-context';

const navigationSections = [
  {
    title: 'GET STARTED',
    items: [
      { title: 'Overview', href: '/docs/overview' },
      { title: 'Quickstart', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
    ]
  },
  {
    title: 'API REFERENCE',
    items: [
      { title: 'Users', href: '/docs/api/users' },
      { title: 'Tenants', href: '/docs/api/tenants' },
      { title: 'Organizations', href: '/docs/api/organizations' },
      { title: 'Permissions', href: '/docs/api/permissions' },
    ]
  },
  {
    title: 'GUIDES',
    items: [
      { title: 'Multi-tenancy', href: '/docs/guides/multi-tenancy' },
      { title: 'Security', href: '/docs/guides/security' },
      { title: 'Performance', href: '/docs/guides/performance' },
    ]
  }
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const ThemeIcon = theme === 'dark' ? Sun : theme === 'light' ? Moon : Monitor;

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden bg-background border shadow-md"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside className={`docs-sidebar ${isMobileOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <Link href="/docs" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MT</span>
            </div>
            <span className="font-semibold text-sidebar-text">MultiTenant Shell</span>
          </Link>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-text-muted" />
            <Input
              type="text"
              placeholder="Search docs..."
              className="docs-search pl-10 bg-sidebar-hover border-sidebar-border text-sidebar-text placeholder:text-sidebar-text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Theme Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-sidebar-text-muted">APPEARANCE</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sidebar-text-muted hover:text-sidebar-text">
                  <ThemeIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-sidebar-bg border-sidebar-border">
                <DropdownMenuItem 
                  onClick={() => setTheme('light')}
                  className="text-sidebar-text hover:bg-sidebar-hover"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme('dark')}
                  className="text-sidebar-text hover:bg-sidebar-hover"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme('system')}
                  className="text-sidebar-text hover:bg-sidebar-hover"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sidebar-text-muted">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-nav-item text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-hover ${
                      pathname === item.href ? 'active bg-sidebar-active text-white' : ''
                    }`}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
EOF
```

### **Step 3.2: Theme-Adaptive Code Examples**
```bash
# Update code examples to support both themes
cat > components/docs/code/CodeExample.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/lib/docs/theme-context';

interface CodeExampleProps {
  title?: string;
  examples: Array<{
    language: string;
    code: string;
    label?: string;
  }>;
}

export function CodeExample({ title, examples }: CodeExampleProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();

  const copyToClipboard = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="code-example-container my-8">
      {title && (
        <h4 className="text-lg font-semibold mb-4 text-content-text">{title}</h4>
      )}
      
      <Tabs defaultValue={examples[0]?.language} className="w-full">
        <TabsList className={`grid w-full grid-cols-3 mb-0 rounded-t-lg rounded-b-none ${
          resolvedTheme === 'dark' 
            ? 'bg-code-bg border-code-border' 
            : 'bg-gray-100 border-gray-200'
        }`}>
          {examples.map((example) => (
            <TabsTrigger 
              key={example.language} 
              value={example.language}
              className={`${
                resolvedTheme === 'dark'
                  ? 'data-[state=active]:bg-code-bg data-[state=active]:text-content-text'
                  : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
              }`}
            >
              {example.label || example.language}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {examples.map((example, index) => (
          <TabsContent 
            key={example.language} 
            value={example.language} 
            className="mt-0 rounded-t-none"
          >
            <div className="code-example bg-code-bg border-code-border">
              <div className={`code-header ${
                resolvedTheme === 'dark' 
                  ? 'bg-code-bg border-code-border' 
                  : 'bg-gray-100 border-gray-200'
              }`}>
                <span className="language-tag text-content-text-muted">{example.language}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(example.code, index)}
                  className="text-content-text-muted hover:text-content-text"
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="code-content bg-code-bg text-code-text">
                <code className={`language-${example.language}`}>
                  {example.code}
                </code>
              </pre>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
EOF
```

### **Step 3.3: Theme-Adaptive API Endpoint Cards**
```bash
# Update API cards for dark/light mode
cat > components/docs/cards/ApiEndpointCard.tsx << 'EOF'
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ApiEndpointCardProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  title: string;
  description: string;
  href: string;
  interactive?: boolean;
}

const getMethodClasses = (method: string) => {
  const baseClasses = "method-badge font-mono text-xs uppercase tracking-wide";
  return `${baseClasses} method-${method.toLowerCase()}`;
};

export function ApiEndpointCard({ 
  method, 
  endpoint, 
  title, 
  description, 
  href,
  interactive = false
}: ApiEndpointCardProps) {
  return (
    <Card className="api-endpoint-card group bg-card-bg border-card-border hover:bg-card-hover transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <div className="endpoint-header">
          <Badge className={getMethodClasses(method)}>
            {method}
          </Badge>
          <code className="endpoint-path font-mono text-sm text-content-text-muted">{endpoint}</code>
        </div>
        <h3 className="text-lg font-semibold text-content-text group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
      </CardHeader>
      
      <CardContent>
        <p className="text-content-text-muted mb-4">{description}</p>
        
        <div className="flex items-center gap-3">
          <Button asChild variant="default" size="sm">
            <Link href={href}>
              View details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          {interactive && (
            <Button variant="outline" size="sm" className="border-card-border text-content-text-muted hover:text-content-text">
              <Play className="mr-2 h-4 w-4" />
              Try it
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
EOF
```

### **Step 3.4: Theme-Adaptive Feature Cards**
```bash
# Create adaptive gradient cards for different themes
cat > components/docs/cards/FeatureCard.tsx << 'EOF'
'use client';

import Link from 'next/link';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { useTheme } from '@/lib/docs/theme-context';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  gradientLight: string;
  gradientDark: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function FeatureCard({ 
  title, 
  description, 
  href, 
  gradientLight,
  gradientDark,
  icon: Icon,
  iconColor = 'white'
}: FeatureCardProps) {
  const { resolvedTheme } = useTheme();
  
  const gradient = resolvedTheme === 'dark' ? gradientDark : gradientLight;

  return (
    <Link href={href}>
      <div 
        className="feature-card group relative p-6 rounded-xl text-white overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300"
        style={{ background: gradient }}
      >
        <div className="feature-icon mb-4">
          <Icon className={`h-8 w-8 text-${iconColor}`} />
        </div>
        
        <h3 className="feature-title text-xl font-semibold mb-2">{title}</h3>
        <p className="feature-description text-white/80 text-sm mb-4">{description}</p>
        
        <ArrowRight className="feature-arrow h-5 w-5 ml-auto group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
EOF
```

### **Step 3.5: Interactive API Playground**
```bash
# Create OpenAI-style interactive API testing
cat > components/docs/interactive/ApiPlayground.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/lib/docs/theme-context';

interface ApiPlaygroundProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  title: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
    example?: string;
  }>;
  headers?: Array<{
    name: string;
    required: boolean;
    description: string;
    example?: string;
  }>;
}

export function ApiPlayground({ 
  method, 
  endpoint, 
  title, 
  description, 
  parameters = [],
  headers = []
}: ApiPlaygroundProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResponse({
        status: 200,
        data: { message: 'Success', timestamp: new Date().toISOString() }
      });
    } catch (error) {
      setResponse({
        status: 500,
        error: 'Internal Server Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getMethodClasses = (method: string) => {
    return `method-${method.toLowerCase()}`;
  };

  return (
    <Card className={`api-playground-card ${
      resolvedTheme === 'dark' ? 'bg-card-bg border-card-border' : 'bg-white border-gray-200'
    }`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge className={getMethodClasses(method)}>
            {method}
          </Badge>
          <code className="endpoint-path">{endpoint}</code>
        </div>
        <CardTitle className="text-content-text">{title}</CardTitle>
        <p className="text-content-text-muted">{description}</p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 ${
            resolvedTheme === 'dark' ? 'bg-code-bg' : 'bg-gray-100'
          }`}>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-4">
            {parameters.length > 0 ? (
              parameters.map((param) => (
                <div key={param.name} className="space-y-2">
                  <Badge className="text-content-text">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </Badge>
                  <Input
                    type={param.type === 'number' ? 'number' : 'text'}
                    placeholder={param.example || `Enter ${param.name}`}
                    value={paramValues[param.name] || ''}
                    onChange={(e) => setParamValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                    className="bg-code-bg border-code-border text-content-text"
                  />
                  <p className="text-xs text-content-text-muted">{param.description}</p>
                </div>
              ))
            ) : (
              <p className="text-content-text-muted">No parameters required</p>
            )}
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            {headers.length > 0 ? (
              headers.map((header) => (
                <div key={header.name} className="space-y-2">
                  <Badge className="text-content-text">
                    {header.name}
                    {header.required && <span className="text-red-500 ml-1">*</span>}
                  </Badge>
                  <Input
                    type="text"
                    placeholder={header.example || `Enter ${header.name}`}
                    value={headerValues[header.name] || ''}
                    onChange={(e) => setHeaderValues(prev => ({ ...prev, [header.name]: e.target.value }))}
                    className="bg-code-bg border-code-border text-content-text"
                  />
                  <p className="text-xs text-content-text-muted">{header.description}</p>
                </div>
              ))
            ) : (
              <p className="text-content-text-muted">No headers required</p>
            )}
          </TabsContent>

          <TabsContent value="response" className="space-y-4">
            {response ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={response.status === 200 ? 'default' : 'destructive'}>
                    {response.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyResponse}
                    className="text-content-text-muted hover:text-content-text"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="code-content bg-code-bg border border-code-border rounded-lg p-4 overflow-x-auto">
                  <code className="text-code-text">
                    {JSON.stringify(response, null, 2)}
                  </code>
                </pre>
              </div>
            ) : (
              <p className="text-content-text-muted">Run the request to see the response</p>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-content-border">
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full bg-button-primary hover:bg-button-primary-hover text-white"
          >
            {isLoading ? (
              <>
                <Settings className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
EOF
```

---

## 📄 **PHASE 4: Content Migration & Enhancement**

### **Step 4.1: Create OpenAI-Style Landing Page**
```bash
# Create beautiful docs homepage inspired by OpenAI
cat > app/docs/page.tsx << 'EOF'
import { Users, Shield, Zap, Database, Search, Boxes } from 'lucide-react';
import { FeatureCard } from '@/components/docs/cards/FeatureCard';
import { ApiEndpointCard } from '@/components/docs/cards/ApiEndpointCard';
import { CodeExample } from '@/components/docs/code/CodeExample';

export default function DocsHomePage() {
  return (
    <div className="docs-home">
      {/* Hero Section */}
      <section className="mb-16">
        <h1 className="docs-title">
          MultiTenant Shell developer platform
        </h1>
        <p className="docs-subtitle">
          Build powerful multi-tenant applications with our comprehensive API. 
          Get started in minutes with our intuitive documentation and interactive examples.
        </p>
        
        {/* Quick Start Code */}
        <CodeExample
          title="Developer quickstart"
          examples={[
            {
              language: 'javascript',
              label: 'JavaScript',
              code: `import { MultiTenantClient } from 'multitenant-shell';

const client = new MultiTenantClient({
  apiKey: process.env.MT_API_KEY,
  tenant: 'your-tenant-id'
});

const users = await client.users.list();
console.log(users);`
            },
            {
              language: 'curl',
              label: 'cURL',
              code: `curl -X GET "https://api.multitenant-shell.com/v1/users" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: your-tenant-id"`
            },
            {
              language: 'python',
              label: 'Python',
              code: `from multitenant_shell import Client

client = Client(
    api_key="YOUR_API_KEY",
    tenant_id="your-tenant-id"
)

users = client.users.list()
print(users)`
            }
          ]}
        />
      </section>

      {/* Feature Showcase */}
      <section className="mb-16">
        <h2 className="docs-section-title">Explore our features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            title="Multi-Tenant Architecture"
            description="Isolate data and users across multiple tenants with enterprise-grade security"
            href="/docs/guides/multi-tenancy"
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            icon={Boxes}
          />
          <FeatureCard
            title="User Management"
            description="Complete user lifecycle management with roles, permissions, and authentication"
            href="/docs/api/users"
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            icon={Users}
          />
          <FeatureCard
            title="Enterprise Security"
            description="Built-in security features including RBAC, audit logs, and data encryption"
            href="/docs/guides/security"
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            icon={Shield}
          />
        </div>
      </section>

      {/* API Endpoints Preview */}
      <section className="mb-16">
        <h2 className="docs-section-title">Start building</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ApiEndpointCard
            method="GET"
            endpoint="/v1/users"
            title="List users"
            description="Retrieve a paginated list of users with filtering and search capabilities"
            href="/docs/api/users#list-users"
            interactive={true}
          />
          <ApiEndpointCard
            method="POST"
            endpoint="/v1/users"
            title="Create user"
            description="Create a new user account with customizable roles and permissions"
            href="/docs/api/users#create-user"
            interactive={true}
          />
          <ApiEndpointCard
            method="GET"
            endpoint="/v1/tenants"
            title="List tenants"
            description="Manage multiple tenants with isolated data and user access"
            href="/docs/api/tenants#list-tenants"
            interactive={true}
          />
          <ApiEndpointCard
            method="POST"
            endpoint="/v1/auth/login"
            title="Authenticate user"
            description="Secure user authentication with JWT tokens and refresh capabilities"
            href="/docs/api/auth#login"
            interactive={true}
          />
        </div>
      </section>
    </div>
  );
}
EOF
```

### **Step 4.2: Enhanced API Reference Pages**
```bash
# Create comprehensive API documentation pages
cat > app/docs/api/users/page.tsx << 'EOF'
import { ApiPlayground } from '@/components/docs/interactive/ApiPlayground';
import { CodeExample } from '@/components/docs/code/CodeExample';

export default function UsersApiPage() {
  return (
    <div className="api-reference">
      <h1 className="docs-title">Users API</h1>
      <p className="docs-subtitle">
        Complete user management functionality including creation, authentication, 
        role management, and tenant access control.
      </p>

      {/* List Users */}
      <section className="mb-12">
        <h2 className="docs-section-title">List users</h2>
        <ApiPlayground
          method="GET"
          endpoint="/v1/users"
          title="Retrieve users"
          description="Get a paginated list of users with optional filtering and search"
          parameters={[
            {
              name: 'page',
              type: 'integer',
              required: false,
              description: 'Page number for pagination',
              default: '1'
            },
            {
              name: 'limit',
              type: 'integer', 
              required: false,
              description: 'Number of users per page',
              default: '10'
            },
            {
              name: 'search',
              type: 'string',
              required: false,
              description: 'Search users by name or email'
            },
            {
              name: 'role',
              type: 'string',
              required: false,
              description: 'Filter by user role'
            }
          ]}
          responseExample={`{
  "data": [
    {
      "id": "user_123",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "admin",
      "tenant_id": "tenant_456",
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-20T14:45:00Z",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "total_pages": 15
  }
}`}
        />
      </section>

      {/* Create User */}
      <section className="mb-12">
        <h2 className="docs-section-title">Create user</h2>
        <ApiPlayground
          method="POST"
          endpoint="/v1/users"
          title="Create a new user"
          description="Create a new user account with specified role and tenant access"
          parameters={[
            {
              name: 'email',
              type: 'string',
              required: true,
              description: 'User email address (must be unique)'
            },
            {
              name: 'name',
              type: 'string',
              required: true,
              description: 'Full name of the user'
            },
            {
              name: 'role',
              type: 'string',
              required: false,
              description: 'User role (admin, manager, user)',
              default: 'user'
            },
            {
              name: 'password',
              type: 'string',
              required: true,
              description: 'User password (min 8 characters)'
            }
          ]}
          responseExample={`{
  "data": {
    "id": "user_789",
    "email": "jane@example.com",
    "name": "Jane Smith",
    "role": "user",
    "tenant_id": "tenant_456",
    "created_at": "2024-01-20T15:30:00Z",
    "status": "active"
  }
}`}
        />
      </section>
    </div>
  );
}
EOF
```

### **Step 4.3: Update Layout with Theme Provider**
```bash
# Update main layout to include theme provider
cat > app/docs/layout.tsx << 'EOF'
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/lib/docs/theme-context';
import { DocsSidebar } from '@/components/docs/navigation/DocsSidebar';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className={`docs-layout ${inter.variable} ${jetbrainsMono.variable}`}>
        <DocsSidebar />
        <main className="docs-main bg-content-bg">
          <div className="docs-content">
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
EOF
```

### **Step 4.4: Comprehensive CSS Updates for Dark/Light Mode**
```bash
# Update globals.css with complete dark/light mode support
cat >> app/globals.css << 'EOF'

/* =========================== */
/* DARK/LIGHT MODE SYSTEM      */
/* =========================== */

/* Base CSS Variables */
:root {
  /* Light Theme (Default) */
  --sidebar-bg: #ffffff;
  --sidebar-text: #1f2937;
  --sidebar-text-muted: #6b7280;
  --sidebar-border: #e5e7eb;
  --sidebar-hover: #f3f4f6;
  --sidebar-active: #2563eb;

  --content-bg: #ffffff;
  --content-text: #1f2937;
  --content-text-muted: #6b7280;
  --content-border: #e5e7eb;

  --code-bg: #f8fafc;
  --code-border: #e2e8f0;
  --code-text: #334155;

  --card-bg: #ffffff;
  --card-hover: #f9fafb;
  --card-border: #e5e7eb;

  --button-primary: #10b981;
  --button-primary-hover: #059669;
  --button-secondary: #f3f4f6;
  --button-secondary-hover: #e5e7eb;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Dark Theme */
[data-theme="dark"] {
  --sidebar-bg: #0f0f0f;
  --sidebar-text: #ffffff;
  --sidebar-text-muted: #a1a1a1;
  --sidebar-border: #2a2a2a;
  --sidebar-hover: #1a1a1a;
  --sidebar-active: #2563eb;

  --content-bg: #111111;
  --content-text: #ffffff;
  --content-text-muted: #a1a1a1;
  --content-border: #2a2a2a;

  --code-bg: #1a1a1a;
  --code-border: #2a2a2a;
  --code-text: #e2e8f0;

  --card-bg: #1a1a1a;
  --card-hover: #2a2a2a;
  --card-border: #2a2a2a;

  --button-primary: #10b981;
  --button-primary-hover: #059669;
  --button-secondary: #2a2a2a;
  --button-secondary-hover: #374151;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}

/* Smooth theme transitions */
* {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

/* =========================== */
/* DOCUMENTATION LAYOUT        */
/* =========================== */

.docs-layout {
  min-height: 100vh;
  display: flex;
  font-family: var(--font-inter);
}

.docs-sidebar {
  width: 300px;
  height: 100vh;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
  z-index: 30;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

.docs-sidebar.open {
  transform: translateX(0);
}

@media (min-width: 768px) {
  .docs-sidebar {
    position: sticky;
    transform: translateX(0);
  }
}

.docs-main {
  flex: 1;
  margin-left: 0;
  background-color: var(--content-bg);
  min-height: 100vh;
}

@media (min-width: 768px) {
  .docs-main {
    margin-left: 300px;
  }
}

.docs-content {
  max-width: 1024px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--content-text);
}

/* =========================== */
/* SIDEBAR COMPONENTS          */
/* =========================== */

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--sidebar-border);
}

.sidebar-nav {
  padding: 1.5rem;
}

.sidebar-nav h3 {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  color: var(--sidebar-text-muted);
}

.sidebar-nav-item {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  color: var(--sidebar-text-muted);
}

.sidebar-nav-item:hover {
  background-color: var(--sidebar-hover);
  color: var(--sidebar-text);
}

.sidebar-nav-item.active {
  background-color: var(--sidebar-active);
  color: white;
}

.docs-search {
  background-color: var(--sidebar-hover);
  border-color: var(--sidebar-border);
  color: var(--sidebar-text);
}

.docs-search::placeholder {
  color: var(--sidebar-text-muted);
}

/* =========================== */
/* CODE COMPONENTS             */
/* =========================== */

.code-example-container {
  margin: 2rem 0;
}

.code-example {
  border: 1px solid var(--code-border);
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: var(--code-bg);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--code-border);
  background-color: var(--code-bg);
}

.language-tag {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--content-text-muted);
}

.code-content {
  padding: 1.5rem;
  overflow-x: auto;
  background-color: var(--code-bg);
  color: var(--code-text);
  font-family: var(--font-jetbrains-mono);
  font-size: 0.875rem;
  line-height: 1.6;
}

.code-content code {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

/* =========================== */
/* API ENDPOINT CARDS          */
/* =========================== */

.api-endpoint-card {
  background-color: var(--card-bg);
  border-color: var(--card-border);
  transition: all 0.2s ease;
}

.api-endpoint-card:hover {
  background-color: var(--card-hover);
  box-shadow: var(--shadow-lg);
}

.endpoint-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.endpoint-path {
  font-family: var(--font-jetbrains-mono);
  font-size: 0.875rem;
  background-color: var(--code-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  color: var(--content-text-muted);
}

/* Method badges with theme support */
.method-badge {
  font-family: var(--font-jetbrains-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid;
}

/* Light theme method colors */
:root .method-get {
  background-color: #dbeafe;
  color: #1e40af;
  border-color: #bfdbfe;
}

:root .method-post {
  background-color: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

:root .method-put {
  background-color: #fed7aa;
  color: #c2410c;
  border-color: #fdba74;
}

:root .method-delete {
  background-color: #fecaca;
  color: #dc2626;
  border-color: #fca5a5;
}

/* Dark theme method colors */
[data-theme="dark"] .method-get {
  background-color: rgba(29, 78, 216, 0.2);
  color: #93c5fd;
  border-color: rgba(29, 78, 216, 0.3);
}

[data-theme="dark"] .method-post {
  background-color: rgba(22, 163, 74, 0.2);
  color: #86efac;
  border-color: rgba(22, 163, 74, 0.3);
}

[data-theme="dark"] .method-put {
  background-color: rgba(234, 88, 12, 0.2);
  color: #fdba74;
  border-color: rgba(234, 88, 12, 0.3);
}

[data-theme="dark"] .method-delete {
  background-color: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.3);
}

/* =========================== */
/* FEATURE CARDS              */
/* =========================== */

.feature-card {
  position: relative;
  padding: 1.5rem;
  border-radius: 0.75rem;
  color: white;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.feature-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.feature-arrow {
  height: 1.25rem;
  width: 1.25rem;
  margin-left: auto;
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-arrow {
  transform: translateX(0.25rem);
}

/* =========================== */
/* CONTENT TYPOGRAPHY          */
/* =========================== */

.docs-content h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--content-text);
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.docs-content h2 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--content-text);
  margin-top: 3rem;
  margin-bottom: 1.5rem;
  line-height: 1.3;
}

.docs-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--content-text);
  margin-top: 2rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.docs-content p {
  color: var(--content-text-muted);
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

.docs-content ul, .docs-content ol {
  color: var(--content-text-muted);
  line-height: 1.7;
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
}

.docs-content li {
  margin-bottom: 0.5rem;
}

.docs-content a {
  color: var(--sidebar-active);
  text-decoration: underline;
  transition: color 0.2s ease;
}

.docs-content a:hover {
  color: var(--button-primary-hover);
}

.docs-content blockquote {
  border-left: 4px solid var(--sidebar-active);
  padding-left: 1rem;
  margin: 1.5rem 0;
  color: var(--content-text-muted);
  font-style: italic;
}

.docs-content hr {
  border: none;
  height: 1px;
  background-color: var(--content-border);
  margin: 3rem 0;
}

/* =========================== */
/* RESPONSIVE DESIGN           */
/* =========================== */

@media (max-width: 768px) {
  .docs-content {
    padding: 1rem;
  }

  .docs-content h1 {
    font-size: 2rem;
  }

  .docs-content h2 {
    font-size: 1.5rem;
  }

  .docs-content h3 {
    font-size: 1.25rem;
  }

  .feature-card {
    padding: 1rem;
  }

  .code-content {
    padding: 1rem;
    font-size: 0.8rem;
  }
}

/* =========================== */
/* ACCESSIBILITY               */
/* =========================== */

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus styles */
.docs-search:focus {
  outline: 2px solid var(--sidebar-active);
  outline-offset: 2px;
}

.sidebar-nav-item:focus {
  outline: 2px solid var(--sidebar-active);
  outline-offset: 2px;
}

button:focus-visible {
  outline: 2px solid var(--sidebar-active);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --sidebar-border: #000000;
    --content-border: #000000;
    --code-border: #000000;
    --card-border: #000000;
  }

  [data-theme="dark"] {
    --sidebar-border: #ffffff;
    --content-border: #ffffff;
    --code-border: #ffffff;
    --card-border: #ffffff;
  }
}

EOF
```

### **Step 4.5: Enhanced API Playground Component**
```bash
# Create interactive API playground with theme support
cat > components/docs/playground/ApiPlayground.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { Send, Copy, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/lib/docs/theme-context';

interface ApiPlaygroundProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  title: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
    example?: string;
  }>;
  headers?: Array<{
    name: string;
    required: boolean;
    description: string;
    example?: string;
  }>;
}

export function ApiPlayground({ 
  method, 
  endpoint, 
  title, 
  description, 
  parameters = [],
  headers = []
}: ApiPlaygroundProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResponse({
        status: 200,
        data: { message: 'Success', timestamp: new Date().toISOString() }
      });
    } catch (error) {
      setResponse({
        status: 500,
        error: 'Internal Server Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getMethodClasses = (method: string) => {
    return `method-${method.toLowerCase()}`;
  };

  return (
    <Card className={`api-playground-card ${
      resolvedTheme === 'dark' ? 'bg-card-bg border-card-border' : 'bg-white border-gray-200'
    }`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge className={getMethodClasses(method)}>
            {method}
          </Badge>
          <code className="endpoint-path">{endpoint}</code>
        </div>
        <CardTitle className="text-content-text">{title}</CardTitle>
        <p className="text-content-text-muted">{description}</p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 ${
            resolvedTheme === 'dark' ? 'bg-code-bg' : 'bg-gray-100'
          }`}>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-4">
            {parameters.length > 0 ? (
              parameters.map((param) => (
                <div key={param.name} className="space-y-2">
                  <Label className="text-content-text">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    type={param.type === 'number' ? 'number' : 'text'}
                    placeholder={param.example || `Enter ${param.name}`}
                    value={paramValues[param.name] || ''}
                    onChange={(e) => setParamValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                    className="bg-code-bg border-code-border text-content-text"
                  />
                  <p className="text-xs text-content-text-muted">{param.description}</p>
                </div>
              ))
            ) : (
              <p className="text-content-text-muted">No parameters required</p>
            )}
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            {headers.length > 0 ? (
              headers.map((header) => (
                <div key={header.name} className="space-y-2">
                  <Label className="text-content-text">
                    {header.name}
                    {header.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    type="text"
                    placeholder={header.example || `Enter ${header.name}`}
                    value={headerValues[header.name] || ''}
                    onChange={(e) => setHeaderValues(prev => ({ ...prev, [header.name]: e.target.value }))}
                    className="bg-code-bg border-code-border text-content-text"
                  />
                  <p className="text-xs text-content-text-muted">{header.description}</p>
                </div>
              ))
            ) : (
              <p className="text-content-text-muted">No headers required</p>
            )}
          </TabsContent>

          <TabsContent value="response" className="space-y-4">
            {response ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={response.status === 200 ? 'default' : 'destructive'}>
                    {response.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyResponse}
                    className="text-content-text-muted hover:text-content-text"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="code-content bg-code-bg border border-code-border rounded-lg p-4 overflow-x-auto">
                  <code className="text-code-text">
                    {JSON.stringify(response, null, 2)}
                  </code>
                </pre>
              </div>
            ) : (
              <p className="text-content-text-muted">Run the request to see the response</p>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-content-border">
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full bg-button-primary hover:bg-button-primary-hover text-white"
          >
            {isLoading ? (
              <>
                <Settings className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
EOF
```

---

## ✅ **Success Criteria**

### **Technical Success**
- [ ] Single `apps/frontend` application with docs at `/docs`
- [ ] **OpenAI-inspired dark sidebar** navigation
- [ ] **Interactive code examples** with copy functionality
- [ ] **Beautiful gradient cards** for feature showcase
- [ ] **API playground** with live testing capabilities
- [ ] **Professional typography** matching OpenAI standards
- [ ] Build process completes without errors
- [ ] **NO duplicate UI components** between docs and frontend

### **Design Success (OpenAI-Inspired)**
- [ ] **Dark sidebar** (#0f0f0f) with light content area
- [ ] **Clean hierarchical navigation** with proper sections
- [ ] **Interactive code blocks** with syntax highlighting
- [ ] **Method badges** with proper color coding
- [ ] **Gradient feature cards** with hover animations
- [ ] **Professional spacing** and typography hierarchy
- [ ] **Mobile responsive** design with collapsible sidebar
- [ ] **Search functionality** in sidebar

### **User Experience Success**
- [ ] **Seamless navigation** between app and docs
- [ ] **Interactive API testing** with real-time feedback
- [ ] **Copy-to-clipboard** functionality on code blocks
- [ ] **Fast page load times** (<3s)
- [ ] **Smooth animations** and hover effects
- [ ] **Consistent visual language** across all pages

### **Content Success**
- [ ] **Comprehensive API documentation** with examples
- [ ] **Getting started guide** with quickstart code
- [ ] **Feature showcase** with beautiful cards
- [ ] **Multi-language code examples** (cURL, JS, Python)
- [ ] **Interactive playgrounds** for each API endpoint
- [ ] **Professional documentation** matching OpenAI quality

---

## 🎯 **Expected Outcomes**

### **Visual Excellence**
- **Premium documentation experience** rivaling OpenAI's quality
- **Professional design system** with consistent branding
- [ ] **Interactive elements** that enhance developer experience
- [ ] **Beautiful code examples** with proper syntax highlighting

### **Developer Experience**
- [ ] **Intuitive navigation** with clear information hierarchy
- [ ] **Live API testing** without leaving the documentation
- [ ] **Multi-language examples** for different developer preferences
- [ ] **Copy-paste ready code** snippets for quick implementation

### **Business Impact**
- [ ] **Increased developer adoption** through better documentation
- [ ] **Reduced support requests** via comprehensive guides
- [ ] **Professional brand image** matching industry leaders
- [ ] **Better SEO performance** with unified content structure

---

**Total Estimated Time: 8-10 days**
**Result: Premium OpenAI-quality documentation platform** 🚀 