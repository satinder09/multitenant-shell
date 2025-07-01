"use client"

// Platform layout is now handled by the unified layout system
// This layout just passes through to the children
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 