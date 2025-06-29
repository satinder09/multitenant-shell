"use client"

import * as React from "react"
import Link from "next/link"
import { ComponentType } from "react"
import {
  IconBuilding,
  IconDashboard,
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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/platform",
      icon: IconDashboard as ComponentType<any>,
    },
    {
      title: "Tenants",
      url: "/platform/tenants",
      icon: IconBuilding as ComponentType<any>,
    },
  ],
  navAdmin: [
    {
      title: "Users",
      icon: IconUsers as ComponentType<any>,
      isActive: false,
      url: "/platform/admin/users",
    },
    {
      title: "Roles",
      icon: IconShield as ComponentType<any>,
      url: "/platform/admin/roles",
    },
    {
      title: "Permissions",
      icon: IconKey as ComponentType<any>,
      url: "/platform/admin/permissions",
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/platform/settings",
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
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase as ComponentType<any>,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport as ComponentType<any>,
    },
    {
      name: "Documentation",
      url: "#",
      icon: IconFileDescription as ComponentType<any>,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/platform">
                <IconSparkles className="!size-5" />
                <span className="text-base font-semibold">Platform Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavMain title="Administration" items={data.navAdmin} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
} 