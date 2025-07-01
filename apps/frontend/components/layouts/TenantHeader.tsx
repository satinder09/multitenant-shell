"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import ThemeToggle from "@/components/common/ThemeToggle"
import { useAuth } from "@/context/AuthContext"
import { usePlatform } from "@/context/PlatformContext"
import { usePathname } from "next/navigation"
import { 
  Bell, 
  Settings, 
  LogOut, 
  User, 
  Shield,
  Search,
  HelpCircle
} from "lucide-react"

// Generate breadcrumbs from pathname for tenant
function generateTenantBreadcrumbs(pathname: string, tenantSubdomain?: string | null) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = []
  
  // Start with tenant name
  const tenantName = tenantSubdomain ? 
    `${tenantSubdomain.charAt(0).toUpperCase() + tenantSubdomain.slice(1)} Portal` : 
    'Tenant Portal'
  
  breadcrumbs.push({
    label: tenantName,
    href: '/',
    isCurrent: pathname === '/'
  })
  
  if (segments.length > 0) {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const href = '/' + segments.slice(0, i + 1).join('/')
      const isLast = i === segments.length - 1
      
      // Capitalize and format segment names
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
      
      breadcrumbs.push({
        label,
        href,
        isCurrent: isLast
      })
    }
  }
  
  return breadcrumbs
}

export default function TenantHeader() {
  const { user, logout } = useAuth()
  const { tenantSubdomain } = usePlatform()
  const pathname = usePathname()
  const breadcrumbs = generateTenantBreadcrumbs(pathname, tenantSubdomain)
  
  const handleLogout = async () => {
    await logout()
  }
  
  // Get user initials for avatar fallback
  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background">
      <div className="flex items-center gap-2 px-4 w-full">
        {/* Left side: Sidebar trigger and breadcrumbs */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="flex-1 min-w-0">
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center">
                  {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                  <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                    {breadcrumb.isCurrent ? (
                      <BreadcrumbPage className="font-medium">
                        {breadcrumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink 
                        href={breadcrumb.href} 
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {breadcrumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right side: Actions and user menu */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:h-9 md:w-9">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Help Button */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:h-9 md:w-9">
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">Help</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:h-9 md:w-9 relative">
                <Bell className="h-4 w-4" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  2
                </Badge>
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col gap-1">
                  <div className="font-medium">Welcome to your workspace</div>
                  <div className="text-sm text-muted-foreground">Get started by exploring your dashboard</div>
                  <div className="text-xs text-muted-foreground">1 hour ago</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col gap-1">
                  <div className="font-medium">System update</div>
                  <div className="text-sm text-muted-foreground">New features are now available</div>
                  <div className="text-xs text-muted-foreground">2 hours ago</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center justify-center">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <ThemeToggle variant="compact" />

          <Separator orientation="vertical" className="h-6" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full md:h-9 md:w-9">
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  {/* Use fallback avatar with user initials */}
                  <AvatarFallback>{getUserInitials(user?.name, user?.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'Tenant User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.isSuperAdmin && (
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="w-3 h-3" />
                      <span className="text-xs">Super Admin</span>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 