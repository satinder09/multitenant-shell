"use client"

import * as React from "react"
import Link from "next/link"
import { ComponentType } from "react"
import {
  IconHome,
  IconDatabase,
  IconFileDescription,
  IconHelp,
  IconKey,
  IconReport,
  IconSearch,
  IconSettings,
  IconShield,
  IconUsers,
  IconSparkles,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/layouts/nav-documents"
import { NavMain } from "@/components/layouts/nav-main"
import { NavSecondary } from "@/components/layouts/nav-secondary"
import { NavUser } from "@/components/layouts/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import { usePlatform } from "@/context/PlatformContext"

export default function TenantSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { tenantSubdomain } = usePlatform()

  // Navigation data for tenant
  const navMain = [
    {
      title: "Home",
      url: "/",
      icon: IconHome as ComponentType<any>,
    },
  ]

  const navAdmin = [
    {
      title: "Roles",
      icon: IconShield as ComponentType<any>,
      url: "/admin/roles",
    },
    {
      title: "Permissions",
      icon: IconKey as ComponentType<any>,
      url: "/admin/permissions",
    },
    {
      title: "Users",
      icon: IconUsers as ComponentType<any>,
      isActive: false,
      url: "/admin/users",
    },
  ]

  const navSecondary = [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings as ComponentType<any>,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp as ComponentType<any>,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch as ComponentType<any>,
    },
  ]

  const documents = [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase as ComponentType<any>,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: IconReport as ComponentType<any>,
    },
    {
      name: "Documentation",
      url: "/docs",
      icon: IconFileDescription as ComponentType<any>,
    },
  ]

  return (
    <Sidebar collapsible="icon" className="border-r" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconSparkles className="!size-5" />
                <span className="text-base font-semibold">
                  {tenantSubdomain ? `${tenantSubdomain.charAt(0).toUpperCase() + tenantSubdomain.slice(1)} Portal` : 'Tenant Portal'}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        
        {/* Administration section */}
        <NavMain title="Administration" items={navAdmin} />
        
        <NavDocuments items={documents} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
} 