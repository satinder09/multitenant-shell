'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

export default function TabsBlock({
  tabs,
  defaultTab,
}: {
  defaultTab: string
  tabs: { id: string; label: string; content: React.ReactNode }[]
}) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
