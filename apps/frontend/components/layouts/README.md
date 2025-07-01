# Unified Layout System

## Overview

This unified layout system provides consistent styling and structure across both **Platform** and **Tenant** interfaces. Based on the robust ShadCN/UI sidebar components, it ensures a professional look and feel while maintaining easy customization.

## Key Features

- **Consistent Styling**: Same visual design across platform and tenant
- **ShadCN/UI Based**: Built on professional, accessible components
- **Context-Aware**: Automatically switches between platform and tenant configurations
- **Fully Functional**: All components wired up and working
- **Collapsible Sidebar**: Icon-only mode for space efficiency
- **Professional Header**: Breadcrumbs, notifications, search, and user menu

## Architecture

### Core Components

1. **UnifiedLayout**: Main layout wrapper that chooses platform or tenant components
2. **PlatformSidebar**: Platform-specific sidebar with admin navigation
3. **TenantSidebar**: Tenant-specific sidebar with tenant navigation  
4. **PlatformHeader**: Platform header with admin breadcrumbs
5. **TenantHeader**: Tenant header with tenant breadcrumbs

### Layout Flow

```
ContextAwareLayout (handles auth + routing)
    ↓
UnifiedLayout (chooses Platform vs Tenant)
    ↓
SidebarProvider (ShadCN wrapper)
    ├── PlatformSidebar / TenantSidebar
    └── SidebarInset
        ├── PlatformHeader / TenantHeader
        └── Content Area
```

## Features

### Sidebar Features
- **Collapsible**: Toggle between full and icon-only modes
- **Branded Header**: Shows "Platform Admin" or "Tenant Portal"
- **Organized Navigation**: Main items + Administration sections
- **Documents Section**: Quick access to data and reports
- **User Profile**: Avatar, name, role indicator, and menu

### Header Features
- **Sidebar Toggle**: Expand/collapse sidebar
- **Smart Breadcrumbs**: Auto-generated from URL path
- **Action Buttons**: Search and Help
- **Notifications**: Dropdown with badge indicators
- **Theme Toggle**: Light/dark mode support
- **User Menu**: Profile, settings, and logout

## Usage

### Default Implementation

The system works automatically with no configuration needed:

```tsx
// Automatically used for all authenticated routes
// Platform routes (lvh.me:3000/platform/*) get Platform components  
// Tenant routes (tenant.lvh.me:3000/*) get Tenant components
```

### Customizing Navigation

To customize navigation items, edit the respective sidebar components:

**Platform Navigation** (`PlatformSidebar.tsx`):
```tsx
const navMain = [
  {
    title: "Dashboard",
    url: "/platform",
    icon: IconDashboard,
  },
  {
    title: "Tenants", 
    url: "/platform/tenants",
    icon: IconBuilding,
  },
]

const navAdmin = [
  {
    title: "Users",
    url: "/platform/admin/users", 
    icon: IconUsers,
  },
  // Add more admin items...
]
```

**Tenant Navigation** (`TenantSidebar.tsx`):
```tsx
const navMain = [
  {
    title: "Home",
    url: "/",
    icon: IconHome,
  },
  // Add more main items...
]

const navAdmin = [
  {
    title: "Roles",
    url: "/admin/roles",
    icon: IconShield, 
  },
  // Add more admin items...
]
```

### Customizing Headers

Headers automatically generate breadcrumbs and can be customized:

**Platform Header**: 
- Breadcrumbs start with "Platform Admin"
- Notifications show platform-specific content
- 3 notification badge by default

**Tenant Header**:
- Breadcrumbs start with tenant name (e.g., "Tenant2 Portal")
- Notifications show tenant-specific content  
- 2 notification badge by default

## Styling

The layout uses ShadCN/UI design tokens:

- **Sidebar Width**: 16rem (256px) normal, 3rem (48px) collapsed
- **Header Height**: 4rem (64px) normal, 3rem (48px) collapsed
- **Color Scheme**: CSS variables for theming
- **Typography**: Consistent font sizes and weights
- **Spacing**: 4px grid system

## Components Reference

### Available Components

```tsx
// Main Layout
export { default as UnifiedLayout } from './UnifiedLayout';
export { default as ContextAwareLayout } from './ContextAwareLayout';

// Specific Components  
export { default as PlatformSidebar } from './PlatformSidebar';
export { default as TenantSidebar } from './TenantSidebar';
export { default as PlatformHeader } from './PlatformHeader';
export { default as TenantHeader } from './TenantHeader';

// Supporting Components
export { NavMain } from './nav-main';
export { NavUser } from './nav-user';
export { NavDocuments } from './nav-documents';
export { NavSecondary } from './nav-secondary';
```

### Icons

Uses Tabler Icons for consistency:
- `IconSparkles`: Branding icon
- `IconDashboard`: Dashboard
- `IconBuilding`: Tenants
- `IconUsers`: Users
- `IconShield`: Roles
- `IconKey`: Permissions
- `IconSettings`: Settings
- `IconHome`: Home
- And more...

## Migration from Old System

The old custom Sidebar and Header components have been removed and replaced with this unified system. All functionality has been preserved and enhanced:

✅ **Removed**: Custom `Sidebar.tsx` and `Header.tsx`  
✅ **Updated**: `ContextAwareLayout` to use unified system  
✅ **Enhanced**: Platform layout simplified to pass-through  
✅ **Maintained**: All navigation and functionality  

## Development

### Adding New Navigation Items

1. Edit the appropriate sidebar component
2. Add new item to `navMain`, `navAdmin`, or `documents` arrays
3. Use existing icons or import new ones from `@tabler/icons-react`
4. Test on both platform and tenant to ensure consistency

### Adding New Header Actions

1. Edit the appropriate header component  
2. Add buttons to the actions section
3. Use ShadCN Button components for consistency
4. Consider mobile responsiveness with size variants

### Testing

Build and test both platform and tenant interfaces:

```bash
npm run build  # Check for TypeScript errors
npm run dev    # Test in browser
```

Access URLs:
- Platform: `http://lvh.me:3000/platform`
- Tenant: `http://tenant2.lvh.me:3000/`

Both should now have identical styling and professional appearance. 