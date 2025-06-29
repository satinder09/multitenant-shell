"use client"

import { AppSidebar } from "@/components/layouts/app-sidebar"
import { SiteHeader } from "@/components/layouts/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 px-8 py-6 min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 