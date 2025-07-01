"use client"

import {
  IconBell,
  IconCreditCard,
  IconLogout,
  IconSettings,
  IconSparkles,
  IconUser,
  IconShield,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, logout } = useAuth()

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

  // Don't render if no user
  if (!user) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {/* Only show image if user has a custom avatar - otherwise use fallback */}
                <AvatarFallback className="rounded-lg">
                  {getUserInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user.name || 'User'}
                </span>
                <span className="truncate text-xs">{user.email}</span>
                {user.isSuperAdmin && (
                  <Badge variant="secondary" className="w-fit mt-0.5 text-xs">
                    <IconShield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {/* Only show image if user has a custom avatar - otherwise use fallback */}
                  <AvatarFallback className="rounded-lg">
                    {getUserInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.name || 'User'}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                  {user.isSuperAdmin && (
                    <Badge variant="secondary" className="w-fit mt-0.5 text-xs">
                      <IconShield className="w-3 h-3 mr-1" />
                      Super Admin
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Show upgrade option for non-admin users */}
            {!user.isSuperAdmin && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <IconSparkles />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUser />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconSettings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconBell />
                Notifications
              </DropdownMenuItem>
              {user.isSuperAdmin && (
                <DropdownMenuItem>
                  <IconCreditCard />
                  Billing
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={handleLogout}
            >
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
} 