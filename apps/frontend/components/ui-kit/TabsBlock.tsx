'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TabItem {
  value: string;
  label: string;
  count?: number;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsBlockProps {
  tabs: TabItem[];
  defaultValue?: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline';
}

export function TabsBlock({ 
  tabs, 
  defaultValue, 
  className,
  orientation = 'horizontal',
  variant = 'default'
}: TabsBlockProps) {
  const firstTab = tabs[0]?.value || '';
  const activeTab = defaultValue || firstTab;

  const getTabsListClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-muted-foreground';
    
    switch (variant) {
      case 'pills':
        return cn(baseClasses, 'bg-muted p-1 h-10');
      case 'underline':
        return cn(baseClasses, 'border-b border-border h-10 w-full justify-start rounded-none bg-transparent p-0');
      default:
        return cn(baseClasses, 'bg-muted p-1 h-10');
    }
  };

  const getTabTriggerClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    switch (variant) {
      case 'pills':
        return cn(baseClasses, 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm');
      case 'underline':
        return cn(baseClasses, 'border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none');
      default:
        return cn(baseClasses, 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm');
    }
  };

  return (
    <Tabs 
      defaultValue={activeTab} 
      className={cn('w-full', className)}
      orientation={orientation}
    >
      <TabsList className={getTabsListClasses()}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={getTabTriggerClasses()}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {tab.count}
                </Badge>
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      
      {tabs.map((tab) => (
        <TabsContent 
          key={tab.value} 
          value={tab.value}
          className="mt-6 space-y-4"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
